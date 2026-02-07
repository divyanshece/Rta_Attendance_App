import jwt
from django.http import JsonResponse
from django.conf import settings
from .models import Device


class JWTEmailUser(str):
    """Custom user class for JWT authentication"""
    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def email(self):
        return str(self)


class JWTAuthenticationMiddleware:
    """
    Middleware to authenticate requests using JWT tokens
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip authentication for public endpoints and admin
        path = request.path.rstrip('/')
        public_paths = [
            '/auth/google',
            '/auth/admin/login',
            '/api/auth/google',
            '/api/auth/admin/login',
            '/departments',
        ]

        if path in public_paths or path == '/admin' or request.path.startswith('/admin/') or request.path.startswith('/departments') or request.path.startswith('/static/'):
            return self.get_response(request)
        
        # Get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'No authentication token provided'},
                status=401
            )
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify and decode token
            payload = jwt.decode(
                token,
                getattr(settings, 'JWT_SECRET', settings.SECRET_KEY),
                algorithms=['HS256']
            )
            
            # Validate token type
            if payload.get('type') == 'refresh':
                return JsonResponse(
                    {'error': 'Refresh token cannot be used for API access'},
                    status=401
                )
            
            # Add user info to request
            request.user = JWTEmailUser(payload['email'])
            request.user_type = payload['user_type']

            # STRICT device validation for students
            if request.user_type == 'student':
                device_id = payload.get('device_id')

                # Students MUST have a valid device_id
                if not device_id:
                    return JsonResponse(
                        {
                            'error': 'Invalid session - please login again',
                            'code': 'NO_DEVICE_ID',
                            'message': 'Your session is invalid. Please logout and login again from the mobile app.'
                        },
                        status=401
                    )

                # Verify device is still active
                device = Device.objects.filter(
                    device_id=device_id,
                    user_email=payload['email'],
                ).first()

                if not device:
                    return JsonResponse(
                        {
                            'error': 'Device not found',
                            'code': 'DEVICE_NOT_FOUND',
                            'message': 'Your device is not registered. Please logout and login again.'
                        },
                        status=403
                    )

                if not device.active:
                    return JsonResponse(
                        {
                            'error': 'Device has been deactivated',
                            'code': 'DEVICE_INACTIVE',
                            'message': 'Your device has been deactivated. This may happen if you logged in from another device. Please contact your teacher to reset your device.'
                        },
                        status=403
                    )

                request.device_id = device_id
            
        except jwt.ExpiredSignatureError:
            return JsonResponse(
                {'error': 'Token has expired'},
                status=401
            )
        except jwt.InvalidTokenError as e:
            return JsonResponse(
                {'error': f'Invalid token: {str(e)}'},
                status=401
            )
        except Exception as e:
            return JsonResponse(
                {'error': f'Authentication error: {str(e)}'},
                status=500
            )
        
        return self.get_response(request)