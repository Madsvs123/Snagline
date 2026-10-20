import re

from django.db.models import Max
from rest_framework import serializers

from .models import Activity, Area, Comment, Issue, IssueLink, Label, Milestone, Project, clean_project_key

HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
OPEN_STATUSES = [Issue.Status.OPEN, Issue.Status.IN_PROGRESS]


def _annotated(obj, name):
    if name in obj.__dict__:
        return obj.__dict__[name]
    return None


class ProjectSerializer(serializers.ModelSerializer):
    open_issue_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'key', 'description', 'open_issue_count', 'created_at']
        read_only_fields = ['created_at', 'open_issue_count']
        extra_kwargs = {
            'key': {'required': False, 'allow_blank': True},
            'description': {'required': False, 'allow_blank': True},
        }

    def get_open_issue_count(self, obj):
        annotated = _annotated(obj, 'open_issue_count')
        if annotated is not None:
            return annotated
        return obj.issues.filter(status__in=OPEN_STATUSES).count()

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Use at least 2 characters.')
        return value

    def validate(self, attrs):
        if self.instance and 'key' not in attrs and 'name' not in attrs:
            return attrs
        name = attrs.get('name') or getattr(self.instance, 'name', '')
        explicit = attrs.get('key') if 'key' in attrs else None
        if self.instance and 'key' not in attrs:
            key = self.instance.key
        else:
            key = clean_project_key(name, explicit if explicit else None)
            if explicit and not key:
                raise serializers.ValidationError({
                    'key': 'Use 2-12 letters and digits, starting with a letter.',
                })
        request = self.context.get('request')
        if request is not None:
            clash = Project.objects.filter(owner=request.user, key=key)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({'key': 'You already have a project with this key.'})
        attrs['key'] = key
        return attrs


class LabelSerializer(serializers.ModelSerializer):
    project_key = serializers.CharField(source='project.key', read_only=True)

    class Meta:
        model = Label
        fields = ['id', 'project', 'project_key', 'name', 'color']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._scope_project('project')

    def _scope_project(self, field_name):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated and field_name in self.fields:
            self.fields[field_name].queryset = Project.objects.filter(owner=user)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Enter a label name.')
        return value

    def validate_color(self, value):
        if not HEX_COLOR.fullmatch(value):
            raise serializers.ValidationError('Use a hex color like #c4532a.')
        return value.lower()

    def validate(self, attrs):
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        name = attrs.get('name') or getattr(self.instance, 'name', None)
        if project and name:
            clash = Label.objects.filter(project=project, name__iexact=name)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({'name': 'That label already exists on this project.'})
        return attrs


class AreaSerializer(serializers.ModelSerializer):
    project_key = serializers.CharField(source='project.key', read_only=True)

    class Meta:
        model = Area
        fields = ['id', 'project', 'project_key', 'name', 'description']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            self.fields['project'].queryset = Project.objects.filter(owner=user)

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Use at least 2 characters.')
        return value

    def validate(self, attrs):
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        name = attrs.get('name') or getattr(self.instance, 'name', None)
        if project and name:
            clash = Area.objects.filter(project=project, name__iexact=name)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({'name': 'That area already exists on this project.'})
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated and project is not None and project.owner_id != user.id:
            raise serializers.ValidationError({'project': 'Choose one of your projects.'})
        return attrs


class MilestoneSerializer(serializers.ModelSerializer):
    project_key = serializers.CharField(source='project.key', read_only=True)
    open_issue_count = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = [
            'id',
            'project',
            'project_key',
            'name',
            'description',
            'due_on',
            'closed',
            'open_issue_count',
            'created_at',
        ]
        read_only_fields = ['created_at', 'open_issue_count', 'project_key']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'due_on': {'required': False, 'allow_null': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            self.fields['project'].queryset = Project.objects.filter(owner=user)

    def get_open_issue_count(self, obj):
        annotated = _annotated(obj, 'open_issue_count')
        if annotated is not None:
            return annotated
        return obj.issues.filter(status__in=OPEN_STATUSES).count()

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Use at least 2 characters.')
        return value

    def validate(self, attrs):
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        if project is None:
            return attrs
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated and project.owner_id != user.id:
            raise serializers.ValidationError({'project': 'Choose one of your projects.'})
        return attrs


class LabelBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ['id', 'name', 'color']


class IssueSerializer(serializers.ModelSerializer):
    labels = LabelBriefSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Label.objects.all(),
        write_only=True,
        required=False,
    )
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    milestone_name = serializers.SerializerMethodField()
    area_name = serializers.SerializerMethodField()
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id',
            'number',
            'title',
            'body',
            'status',
            'severity',
            'project',
            'project_name',
            'project_key',
            'milestone',
            'milestone_name',
            'area',
            'area_name',
            'labels',
            'label_ids',
            'reporter_name',
            'comment_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['number', 'reporter_name', 'created_at', 'updated_at']
        extra_kwargs = {
            'body': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            self.fields['project'].queryset = Project.objects.filter(owner=user)
            self.fields['milestone'].queryset = Milestone.objects.filter(project__owner=user)
            self.fields['area'].queryset = Area.objects.filter(project__owner=user)
            self.fields['label_ids'].queryset = Label.objects.filter(project__owner=user)
        self.fields['milestone'].allow_null = True
        self.fields['milestone'].required = False
        self.fields['area'].allow_null = True
        self.fields['area'].required = False

    def get_milestone_name(self, obj):
        if obj.milestone_id and obj.milestone:
            return obj.milestone.name
        return None

    def get_area_name(self, obj):
        if obj.area_id and obj.area:
            return obj.area.name
        return None

    def get_comment_count(self, obj):
        annotated = _annotated(obj, 'comment_count')
        if annotated is not None:
            return annotated
        return obj.comments.count()

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError('Use at least 3 characters.')
        return value

    def validate(self, attrs):
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        labels = attrs.get('label_ids')
        if project and labels:
            for label in labels:
                if label.project_id != project.id:
                    raise serializers.ValidationError({
                        'label_ids': 'Labels must belong to the selected project.',
                    })
        if project and 'milestone' in attrs and attrs['milestone'] is not None:
            if attrs['milestone'].project_id != project.id:
                raise serializers.ValidationError({
                    'milestone': 'Milestone must belong to the selected project.',
                })
        if project and 'area' in attrs and attrs['area'] is not None:
            if attrs['area'].project_id != project.id:
                raise serializers.ValidationError({
                    'area': 'Area must belong to the selected project.',
                })
        return attrs

    def create(self, validated_data):
        label_ids = validated_data.pop('label_ids', [])
        project = validated_data['project']
        last_number = Issue.objects.filter(project=project).aggregate(highest=Max('number'))['highest'] or 0
        validated_data['number'] = last_number + 1
        validated_data['reporter'] = self.context['request'].user
        issue = Issue.objects.create(**validated_data)
        if label_ids:
            issue.labels.set(label_ids)
        return issue

    def update(self, instance, validated_data):
        label_ids = validated_data.pop('label_ids', None)
        issue = super().update(instance, validated_data)
        if label_ids is not None:
            issue.labels.set(label_ids)
        return issue


class IssueLinkSerializer(serializers.ModelSerializer):
    source_key = serializers.SerializerMethodField()
    target_key = serializers.SerializerMethodField()
    source_title = serializers.CharField(source='source.title', read_only=True)
    target_title = serializers.CharField(source='target.title', read_only=True)

    class Meta:
        model = IssueLink
        fields = [
            'id',
            'source',
            'target',
            'kind',
            'source_key',
            'target_key',
            'source_title',
            'target_title',
            'created_at',
        ]
        read_only_fields = ['created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            owned = Issue.objects.filter(project__owner=user)
            self.fields['source'].queryset = owned
            self.fields['target'].queryset = owned

    def get_source_key(self, obj):
        return obj.source.display_key

    def get_target_key(self, obj):
        return obj.target.display_key

    def validate(self, attrs):
        source = attrs.get('source') or getattr(self.instance, 'source', None)
        target = attrs.get('target') or getattr(self.instance, 'target', None)
        kind = attrs.get('kind') or getattr(self.instance, 'kind', None)
        if source is None or target is None:
            return attrs
        if source.pk == target.pk:
            raise serializers.ValidationError('An issue cannot link to itself.')
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            if source.project.owner_id != user.id or target.project.owner_id != user.id:
                raise serializers.ValidationError('Link issues from your own projects.')
        if kind:
            clash = IssueLink.objects.filter(source=source, target=target, kind=kind)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError('That link already exists.')
        return attrs


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'issue', 'body', 'author', 'author_name', 'created_at']
        read_only_fields = ['author', 'created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            self.fields['issue'].queryset = Issue.objects.filter(project__owner=user)

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Write a comment.')
        return value

    def validate_issue(self, issue):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and issue.project.owner_id != user.id:
            raise serializers.ValidationError('Issue not found.')
        return issue


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)
    issue_title = serializers.CharField(source='issue.title', read_only=True)
    issue_number = serializers.IntegerField(source='issue.number', read_only=True)
    project_key = serializers.CharField(source='issue.project.key', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id',
            'kind',
            'detail',
            'created_at',
            'actor_name',
            'issue',
            'issue_title',
            'issue_number',
            'project_key',
        ]
