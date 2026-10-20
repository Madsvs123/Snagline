from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityViewSet,
    CommentViewSet,
    DashboardView,
    IssueViewSet,
    LabelViewSet,
    MilestoneViewSet,
    ProjectViewSet,
)

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('labels', LabelViewSet, basename='label')
router.register('milestones', MilestoneViewSet, basename='milestone')
router.register('issues', IssueViewSet, basename='issue')
router.register('comments', CommentViewSet, basename='comment')
router.register('activity', ActivityViewSet, basename='activity')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
