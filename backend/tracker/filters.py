import django_filters
from django.db.models import Q

from .models import Activity, Area, Comment, Issue, IssueLink, IssueTemplate, Label, Milestone


class IssueFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    severity = django_filters.CharFilter(field_name='severity')
    project = django_filters.NumberFilter(field_name='project_id')
    milestone = django_filters.NumberFilter(field_name='milestone_id')
    label = django_filters.NumberFilter(field_name='labels__id')
    area = django_filters.NumberFilter(field_name='area_id')

    class Meta:
        model = Issue
        fields = ['status', 'severity', 'project', 'milestone', 'label', 'area']


class IssueLinkFilter(django_filters.FilterSet):
    issue = django_filters.NumberFilter(method='filter_issue')

    class Meta:
        model = IssueLink
        fields = ['issue']

    def filter_issue(self, queryset, name, value):
        return queryset.filter(Q(source_id=value) | Q(target_id=value))


class CommentFilter(django_filters.FilterSet):
    issue = django_filters.NumberFilter(field_name='issue_id')

    class Meta:
        model = Comment
        fields = ['issue']


class ActivityFilter(django_filters.FilterSet):
    issue = django_filters.NumberFilter(field_name='issue_id')

    class Meta:
        model = Activity
        fields = ['issue']


class LabelFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project_id')

    class Meta:
        model = Label
        fields = ['project']


class IssueTemplateFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project_id')

    class Meta:
        model = IssueTemplate
        fields = ['project']


class AreaFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project_id')

    class Meta:
        model = Area
        fields = ['project']


class MilestoneFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project_id')
    closed = django_filters.BooleanFilter(field_name='closed')

    class Meta:
        model = Milestone
        fields = ['project', 'closed']
