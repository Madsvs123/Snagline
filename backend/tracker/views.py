from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import (
    ActivityFilter,
    AreaFilter,
    CommentFilter,
    IssueFilter,
    IssueLinkFilter,
    IssueTemplateFilter,
    LabelFilter,
    MilestoneFilter,
)
from .models import Activity, Area, Comment, Issue, IssueLink, IssueTemplate, Label, Milestone, Project, SavedFilter
from .serializers import (
    ActivitySerializer,
    AreaSerializer,
    CommentSerializer,
    IssueLinkSerializer,
    IssueSerializer,
    IssueTemplateSerializer,
    LabelSerializer,
    MilestoneSerializer,
    ProjectSerializer,
    SavedFilterSerializer,
)
from .services import seed_default_labels

OPEN_STATUSES = [Issue.Status.OPEN, Issue.Status.IN_PROGRESS]


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user).annotate(
            open_issue_count=Count('issues', filter=Q(issues__status__in=OPEN_STATUSES)),
        ).order_by('name')

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        seed_default_labels(project)


class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = LabelFilter
    ordering_fields = ['name']

    def get_queryset(self):
        return Label.objects.filter(project__owner=self.request.user).select_related('project').order_by('name')


class AreaViewSet(viewsets.ModelViewSet):
    serializer_class = AreaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = AreaFilter
    ordering_fields = ['name']

    def get_queryset(self):
        return Area.objects.filter(project__owner=self.request.user).select_related('project').order_by('name')


class MilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = MilestoneFilter
    ordering_fields = ['due_on', 'name', 'created_at']

    def get_queryset(self):
        return Milestone.objects.filter(project__owner=self.request.user).select_related('project').annotate(
            open_issue_count=Count('issues', filter=Q(issues__status__in=OPEN_STATUSES)),
        ).order_by('closed', 'due_on', 'name')


class IssueViewSet(viewsets.ModelViewSet):
    serializer_class = IssueSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = IssueFilter
    search_fields = ['title', 'body']
    ordering_fields = ['created_at', 'updated_at', 'number', 'severity', 'status']
    ordering = ['-updated_at']

    def get_queryset(self):
        return (
            Issue.objects.filter(project__owner=self.request.user)
            .select_related('project', 'milestone', 'area', 'reporter')
            .prefetch_related('labels')
            .annotate(comment_count=Count('comments', distinct=True))
            .distinct()
        )

    def perform_create(self, serializer):
        issue = serializer.save()
        Activity.objects.create(
            issue=issue,
            actor=self.request.user,
            kind='created',
            detail=f'Opened {issue.project.key}-{issue.number}',
        )

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        previous_severity = serializer.instance.severity
        issue = serializer.save()
        if issue.status != previous_status:
            status_labels = dict(Issue.Status.choices)
            Activity.objects.create(
                issue=issue,
                actor=self.request.user,
                kind='status_changed',
                detail=f'{status_labels.get(previous_status, previous_status)} -> {status_labels.get(issue.status, issue.status)}',
            )
        if issue.severity != previous_severity:
            severity_labels = dict(Issue.Severity.choices)
            Activity.objects.create(
                issue=issue,
                actor=self.request.user,
                kind='severity_changed',
                detail=(
                    f'{severity_labels.get(previous_severity, previous_severity)} -> '
                    f'{severity_labels.get(issue.severity, issue.severity)}'
                ),
            )

    @action(detail=False, methods=['post'], url_path='bulk-status')
    def bulk_status(self, request):
        raw_ids = request.data.get('ids')
        status = request.data.get('status')
        if not isinstance(raw_ids, list) or not raw_ids:
            raise ValidationError({'ids': 'Choose at least one issue.'})
        try:
            ids = [int(value) for value in raw_ids]
        except (TypeError, ValueError) as exc:
            raise ValidationError({'ids': 'Issue ids must be numbers.'}) from exc
        if status not in Issue.Status.values:
            raise ValidationError({'status': 'Choose a valid status.'})
        status_labels = dict(Issue.Status.choices)
        updated = []
        for issue in self.get_queryset().filter(pk__in=ids):
            if issue.status == status:
                continue
            previous = issue.status
            issue.status = status
            issue.save(update_fields=['status', 'updated_at'])
            Activity.objects.create(
                issue=issue,
                actor=request.user,
                kind='status_changed',
                detail=f'{status_labels.get(previous, previous)} -> {status_labels.get(status, status)}',
            )
            updated.append(issue.id)
        return Response({'updated': updated, 'status': status})


class IssueLinkViewSet(viewsets.ModelViewSet):
    serializer_class = IssueLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = IssueLinkFilter

    def get_queryset(self):
        return IssueLink.objects.filter(source__project__owner=self.request.user).select_related(
            'source',
            'source__project',
            'target',
            'target__project',
        )

    def perform_create(self, serializer):
        link = serializer.save()
        kind_labels = dict(IssueLink.Kind.choices)
        Activity.objects.create(
            issue=link.source,
            actor=self.request.user,
            kind='linked',
            detail=f'{link.source.display_key} {kind_labels.get(link.kind, link.kind).lower()} {link.target.display_key}',
        )

    def perform_destroy(self, instance):
        Activity.objects.create(
            issue=instance.source,
            actor=self.request.user,
            kind='unlinked',
            detail=f'Removed the link from {instance.source.display_key} to {instance.target.display_key}',
        )
        instance.delete()


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CommentFilter

    def get_queryset(self):
        return Comment.objects.filter(issue__project__owner=self.request.user).select_related('author', 'issue').order_by('created_at')

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        Activity.objects.create(
            issue=comment.issue,
            actor=self.request.user,
            kind='commented',
            detail='Added a comment',
        )


class IssueTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = IssueTemplateSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = IssueTemplateFilter
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        return IssueTemplate.objects.filter(project__owner=self.request.user).select_related('project').order_by('name')


class SavedFilterViewSet(viewsets.ModelViewSet):
    serializer_class = SavedFilterSerializer

    def get_queryset(self):
        return SavedFilter.objects.filter(owner=self.request.user).select_related(
            'project',
            'milestone',
            'label',
            'area',
        )


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivitySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ActivityFilter

    def get_queryset(self):
        return Activity.objects.filter(issue__project__owner=self.request.user).select_related(
            'actor',
            'issue',
            'issue__project',
        )


class DashboardView(APIView):
    def get(self, request):
        owned = Issue.objects.filter(project__owner=request.user)
        status_rows = {row['status']: row['total'] for row in owned.values('status').annotate(total=Count('id'))}
        counts = {value: status_rows.get(value, 0) for value, _label in Issue.Status.choices}
        counts['total'] = sum(counts.values())
        severity_rows = {
            row['severity']: row['total'] for row in owned.values('severity').annotate(total=Count('id'))
        }
        by_severity = [
            {'severity': value, 'label': label, 'count': severity_rows.get(value, 0)}
            for value, label in Issue.Severity.choices
        ]
        recent_queryset = (
            owned.select_related('project', 'milestone', 'area', 'reporter')
            .prefetch_related('labels')
            .annotate(comment_count=Count('comments', distinct=True))
            .order_by('-updated_at')[:6]
        )
        recent_activity = Activity.objects.filter(issue__project__owner=request.user).select_related(
            'actor',
            'issue',
            'issue__project',
        )[:8]
        return Response({
            'counts': counts,
            'by_severity': by_severity,
            'recent_issues': IssueSerializer(recent_queryset, many=True, context={'request': request}).data,
            'recent_activity': ActivitySerializer(recent_activity, many=True).data,
        })
