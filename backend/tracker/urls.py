from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityViewSet,
    AreaViewSet,
    CommentViewSet,
    DashboardView,
    IssueLinkViewSet,
    IssueTemplateViewSet,
    IssueViewSet,
    LabelViewSet,
    MilestoneViewSet,
    ProjectViewSet,
    SavedFilterViewSet,
)

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('labels', LabelViewSet, basename='label')
router.register('areas', AreaViewSet, basename='area')
router.register('milestones', MilestoneViewSet, basename='milestone')
router.register('issues', IssueViewSet, basename='issue')
router.register('issue-templates', IssueTemplateViewSet, basename='issue-template')
router.register('issue-links', IssueLinkViewSet, basename='issue-link')
router.register('comments', CommentViewSet, basename='comment')
router.register('activity', ActivityViewSet, basename='activity')
router.register('saved-filters', SavedFilterViewSet, basename='saved-filter')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
