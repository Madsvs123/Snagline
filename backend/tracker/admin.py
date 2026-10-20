from django.contrib import admin

from .models import Activity, Comment, Issue, Label, Milestone, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'owner', 'created_at')
    search_fields = ('name', 'key', 'owner__username')


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'project', 'status', 'severity', 'updated_at')
    list_filter = ('status', 'severity')
    search_fields = ('title', 'body')


admin.site.register(Label)
admin.site.register(Milestone)
admin.site.register(Comment)
admin.site.register(Activity)
