import math

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.conf import settings


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two GPS coordinates using Haversine formula."""
    R = 6371000  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class AttendanceConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add('all_students', self.channel_name)
        await self.channel_layer.group_add('all_teachers', self.channel_name)

        await self.send_json({
            'type': 'connected',
            'message': 'WebSocket connected'
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('all_students', self.channel_name)
        await self.channel_layer.group_discard('all_teachers', self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get('type')

        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

        elif msg_type == 'submit_otp':
            session_id = content.get('session_id')
            otp = content.get('otp')
            student_email = content.get('student_email')
            device_id = content.get('device_id')  # For security verification
            latitude = content.get('latitude')
            longitude = content.get('longitude')

            result = await self.process_otp(session_id, otp, student_email, device_id, latitude, longitude)
            await self.send_json(result)

            # Broadcast to teacher if successful
            if result.get('success'):
                await self.channel_layer.group_send(
                    'all_teachers',
                    {
                        'type': 'attendance_update',
                        'session_id': session_id,
                        'student_email': result.get('student_email'),
                        'status': result.get('status', 'P')
                    }
                )

        else:
            await self.send_json({'type': 'echo', 'data': content})

    @database_sync_to_async
    def process_otp(self, session_id, otp, student_email, device_id=None, latitude=None, longitude=None):
        from core.models import Session, Attendance, Student, Device

        MAX_RETRY_COUNT = 3
        OTP_VALIDITY_SECONDS = getattr(settings, 'OTP_VALIDITY_SECONDS', 30)  # 30 seconds default

        try:
            session = Session.objects.get(session_id=session_id)

            if not session.is_active:
                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': 'Session closed',
                    'retry_available': False,
                    'blocked': False
                }

            # Validate student email is provided
            if not student_email:
                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': 'Student email not provided',
                    'retry_available': False,
                    'blocked': False
                }

            # Get student
            try:
                student = Student.objects.get(student_email=student_email)
            except Student.DoesNotExist:
                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': 'Student not found',
                    'retry_available': False,
                    'blocked': False
                }

            # Security check: Verify device if device_id provided
            if device_id:
                device_exists = Device.objects.filter(
                    device_id=device_id,
                    user_email=student_email,
                    active=True
                ).exists()
                if not device_exists:
                    return {
                        'type': 'otp_result',
                        'success': False,
                        'message': 'Device not authorized',
                        'retry_available': False,
                        'blocked': False
                    }

            # Get attendance record
            attendance = Attendance.objects.filter(
                session=session,
                student=student
            ).first()

            if not attendance:
                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': 'You are not enrolled in this class',
                    'retry_available': False,
                    'blocked': False
                }

            # Check if already marked present
            if attendance.status == 'P':
                return {
                    'type': 'otp_result',
                    'success': True,
                    'message': 'Attendance already marked',
                    'status': 'P',
                    'student_email': student.student_email
                }

            # Check if blocked due to too many retries
            if attendance.retry_count >= MAX_RETRY_COUNT:
                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': 'Too many failed attempts. Contact your teacher for manual marking.',
                    'retry_available': False,
                    'blocked': True,
                    'retry_count': attendance.retry_count
                }

            # Check OTP expiry (30 seconds)
            if session.otp_generated_at:
                elapsed = (timezone.now() - session.otp_generated_at).total_seconds()
                if elapsed > OTP_VALIDITY_SECONDS:
                    return {
                        'type': 'otp_result',
                        'success': False,
                        'message': 'OTP expired. Wait for teacher to generate new OTP.',
                        'retry_available': False,
                        'blocked': False
                    }

            # Validate OTP (case-insensitive for alphanumeric)
            if session.otp.upper() != otp.upper():
                # Increment retry count
                attendance.retry_count += 1
                attendance.save()

                remaining_attempts = MAX_RETRY_COUNT - attendance.retry_count

                if attendance.retry_count >= MAX_RETRY_COUNT:
                    return {
                        'type': 'otp_result',
                        'success': False,
                        'message': 'Too many failed attempts. Contact your teacher for manual marking.',
                        'retry_available': False,
                        'blocked': True,
                        'retry_count': attendance.retry_count
                    }

                return {
                    'type': 'otp_result',
                    'success': False,
                    'message': f'Invalid OTP. {remaining_attempts} attempt(s) remaining.',
                    'retry_available': True,
                    'blocked': False,
                    'retry_count': attendance.retry_count,
                    'remaining_attempts': remaining_attempts
                }

            # OTP is valid - determine status based on GPS proximity
            if session.class_mode == 'offline' and session.teacher_latitude is not None and session.teacher_longitude is not None:
                if latitude is not None and longitude is not None:
                    try:
                        distance = haversine(
                            session.teacher_latitude, session.teacher_longitude,
                            float(latitude), float(longitude)
                        )
                        if distance <= session.proximity_radius:
                            attendance.status = 'P'
                            message = 'Attendance marked successfully'
                        else:
                            attendance.status = 'X'
                            message = 'Attendance flagged — you appear to be outside classroom range'
                    except (ValueError, TypeError):
                        attendance.status = 'X'
                        message = 'Attendance flagged — invalid location data'
                else:
                    # No GPS data from student in offline mode
                    attendance.status = 'X'
                    message = 'Attendance flagged — location not available'
            else:
                # Online mode or no teacher location — just mark Present
                attendance.status = 'P'
                message = 'Attendance marked successfully'

            attendance.submitted_at = timezone.now()
            attendance.save()

            return {
                'type': 'otp_result',
                'success': True,
                'message': message,
                'status': attendance.status,
                'student_email': student.student_email
            }

        except Session.DoesNotExist:
            return {
                'type': 'otp_result',
                'success': False,
                'message': 'Session not found',
                'retry_available': False,
                'blocked': False
            }
        except Exception as e:
            return {
                'type': 'otp_result',
                'success': False,
                'message': f'Error: {str(e)}',
                'retry_available': False,
                'blocked': False
            }

    async def attendance_started(self, event):
        await self.send_json({
            'type': 'attendance_started',
            'session_id': event['session_id'],
            'message': event['message']
        })

    async def attendance_update(self, event):
        await self.send_json({
            'type': 'attendance_update',
            'session_id': event['session_id'],
            'student_email': event['student_email'],
            'status': event['status']
        })

    async def attendance_closed(self, event):
        await self.send_json({
            'type': 'attendance_closed',
            'session_id': event['session_id'],
            'message': event['message']
        })

    async def otp_regenerated(self, event):
        await self.send_json({
            'type': 'otp_regenerated',
            'session_id': event['session_id'],
            'message': event['message']
        })
