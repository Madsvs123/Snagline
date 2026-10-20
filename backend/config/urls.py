from django.contrib import admin
from django.urls import include, path

admin.site.site_header = 'Snagline'
admin.site.site_title = 'Snagline admin'
admin.site.index_title = 'Defects and tasks'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('tracker.urls')),
]
