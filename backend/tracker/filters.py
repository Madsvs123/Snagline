import django_filters

from .models import Activity, Comment, Issue, Label, Milestone


class IssueFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    severity = django_filters.CharFilter(field_name='severity')
    project = django_filters.NumberFilter(field_name='project_id')
    milestone = django_filters.NumberFilter(field_name='milestone_id')
    label = django_filters.NumberFilter(field_name='labels__id')

    class Meta:
        model = Issue
        fields = ['status', 'severity', 'project', 'milestone', 'label']


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


class MilestoneFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project_id')
    closed = django_filters.BooleanFilter(field_name='closed')

    class Meta:
        model = Milestone
        fields = ['project', 'closed']
