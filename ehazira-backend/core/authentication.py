"""
Custom DRF Authentication and Permission classes for JWT middleware integration.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission


class JWTMiddlewareAuthentication(BaseAuthentication):
    """
    DRF Authentication class that reads user info set by our JWT middleware.
    This bridges our JWT middleware with DRF's authentication system.
    """
    def authenticate(self, request):
        # Get the original Django request (DRF wraps it)
        django_request = getattr(request, '_request', request)

        # Check if our middleware authenticated this request
        if not hasattr(django_request, 'user_type') or django_request.user_type is None:
            return None  # Not authenticated via JWT middleware

        # Copy attributes to DRF request for convenience
        request.user_type = django_request.user_type
        if hasattr(django_request, 'device_id'):
            request.device_id = django_request.device_id

        # Return (user, auth) tuple as required by DRF
        # user is our JWTEmailUser from middleware, auth is None
        return (django_request.user, None)


class IsJWTAuthenticated(BasePermission):
    """Permission class that checks if request was authenticated via JWT"""
    def has_permission(self, request, view):
        return hasattr(request, 'user_type') and request.user_type is not None
