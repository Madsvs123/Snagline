from django.contrib import admin

from .models import Activity, Area, Comment, Issue, IssueLink, IssueTemplate, Label, Milestone, Project, SavedFilter


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'owner', 'created_at')
    search_fields = ('name', 'key', 'owner__username')


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'project', 'status', 'severity', 'updated_at')
    list_filter = ('status', 'severity')
    search_fields = ('title', 'body')


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'project')
    search_fields = ('name', 'project__key')


admin.site.register(Label)
admin.site.register(Milestone)
admin.site.register(Comment)
admin.site.register(IssueLink)
admin.site.register(IssueTemplate)
admin.site.register(Activity)
admin.site.register(SavedFilter)
