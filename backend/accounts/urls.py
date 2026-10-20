from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import MeView, RegisterView, SnagTokenObtainPairView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', SnagTokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
]
