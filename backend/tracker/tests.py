from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework.test import APITestCase

from tracker.models import Activity, Comment, Issue, Label, Project


class RegisterTests(APITestCase):
    def test_register_creates_owner_default_project_and_token(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'owner',
                'email': 'owner@example.com',
                'password': 'Snagline-pass-1',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['username'], 'owner')
        self.assertIn('access', response.data)
        project = Project.objects.get(owner__username='owner')
        self.assertEqual(project.key, 'INBOX')
        self.assertEqual(project.name, 'Inbox')
        self.assertEqual(Label.objects.filter(project=project).count(), 3)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['username'], 'owner')
        self.assertEqual(me.data['email'], 'owner@example.com')

    def test_login_returns_username(self):
        User.objects.create_user('owner', 'owner@example.com', 'Snagline-pass-1')
        response = self.client.post(
            '/api/auth/token/',
            {'username': 'owner', 'password': 'Snagline-pass-1'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['username'], 'owner')
        self.assertIn('access', response.data)


class IssueWorkflowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('owner', 'owner@example.com', 'Snagline-pass-1')
        self.project = Project.objects.create(
            owner=self.user,
            name='Editor',
            key='EDIT',
            description='Editor defects',
        )
        self.client.force_authenticate(self.user)

    def test_create_issue_comment_and_change_status(self):
        created = self.client.post(
            '/api/issues/',
            {
                'project': self.project.id,
                'title': 'Save button drops the draft',
                'body': 'Clicking save on the editor clears the textarea.',
                'severity': 'high',
                'status': 'open',
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        issue_id = created.data['id']
        self.assertEqual(created.data['number'], 1)
        self.assertEqual(created.data['project_key'], 'EDIT')
        self.assertEqual(created.data['status'], 'open')
        self.assertTrue(Activity.objects.filter(issue_id=issue_id, kind='created').exists())

        comment = self.client.post(
            '/api/comments/',
            {'issue': issue_id, 'body': 'Reproduced on the editor page.'},
            format='json',
        )
        self.assertEqual(comment.status_code, 201, comment.data)
        self.assertEqual(Comment.objects.filter(issue_id=issue_id).count(), 1)
        self.assertTrue(Activity.objects.filter(issue_id=issue_id, kind='commented').exists())

        comments = self.client.get('/api/comments/', {'issue': issue_id})
        self.assertEqual(comments.status_code, 200)
        self.assertEqual(comments.data['count'], 1)
        self.assertEqual(comments.data['results'][0]['body'], 'Reproduced on the editor page.')

        updated = self.client.patch(
            f'/api/issues/{issue_id}/',
            {'status': 'in_progress'},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data['status'], 'in_progress')
        self.assertEqual(Issue.objects.get(pk=issue_id).status, 'in_progress')
        self.assertTrue(Activity.objects.filter(issue_id=issue_id, kind='status_changed').exists())

        listed = self.client.get('/api/issues/', {'search': 'Draft', 'status': 'in_progress'})
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data['count'], 1)
        self.assertEqual(listed.data['results'][0]['id'], issue_id)

        hidden = self.client.get('/api/issues/', {'status': 'open'})
        self.assertEqual(hidden.data['count'], 0)

        dashboard = self.client.get('/api/dashboard/')
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data['counts']['in_progress'], 1)
        self.assertEqual(dashboard.data['counts']['open'], 0)
        self.assertEqual(dashboard.data['counts']['total'], 1)
        self.assertEqual(dashboard.data['by_severity'][2]['severity'], 'high')
        self.assertEqual(dashboard.data['by_severity'][2]['count'], 1)

    def test_milestone_label_and_owner_scope(self):
        milestone = self.client.post(
            '/api/milestones/',
            {
                'project': self.project.id,
                'name': 'Editor fixes',
                'description': 'Draft persistence fixes',
                'due_on': '2026-12-01',
            },
            format='json',
        )
        self.assertEqual(milestone.status_code, 201, milestone.data)
        label = self.client.post(
            '/api/labels/',
            {'project': self.project.id, 'name': 'regression', 'color': '#8c2f39'},
            format='json',
        )
        self.assertEqual(label.status_code, 201, label.data)
        issue = self.client.post(
            '/api/issues/',
            {
                'project': self.project.id,
                'title': 'Reload loses the caret',
                'body': 'Caret jumps to the start after reload.',
                'severity': 'medium',
                'milestone': milestone.data['id'],
                'label_ids': [label.data['id']],
            },
            format='json',
        )
        self.assertEqual(issue.status_code, 201, issue.data)
        self.assertEqual(issue.data['milestone'], milestone.data['id'])
        self.assertEqual(issue.data['labels'][0]['name'], 'regression')

        filtered = self.client.get('/api/issues/', {'label': label.data['id'], 'severity': 'medium'})
        self.assertEqual(filtered.data['count'], 1)

        other = User.objects.create_user('other', 'other@example.com', 'Snagline-pass-1')
        self.client.force_authenticate(other)
        denied = self.client.get(f"/api/issues/{issue.data['id']}/")
        self.assertEqual(denied.status_code, 404)
        self.assertEqual(self.client.get('/api/issues/').data['count'], 0)

    def test_issues_require_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/issues/')
        self.assertEqual(response.status_code, 401)


class TrackerFeatureTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('owner', 'owner@example.com', 'Snagline-pass-1')
        self.project = Project.objects.create(owner=self.user, name='Editor', key='EDIT')
        self.client.force_authenticate(self.user)

    def _issue(self, title, **extra):
        payload = {
            'project': self.project.id,
            'title': title,
            'body': extra.pop('body', ''),
            'severity': extra.pop('severity', 'medium'),
        }
        payload.update(extra)
        response = self.client.post('/api/issues/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response

    def test_area_can_be_attached_to_an_issue(self):
        area = self.client.post(
            '/api/areas/',
            {'project': self.project.id, 'name': 'Editor', 'description': 'Drafts'},
            format='json',
        )
        self.assertEqual(area.status_code, 201, area.data)
        issue = self._issue('Caret jumps', area=area.data['id'])
        self.assertEqual(issue.data['area_name'], 'Editor')
        listed = self.client.get('/api/issues/', {'area': area.data['id']})
        self.assertEqual(listed.data['count'], 1)

    def test_links_blocks_relates_and_owner_scope(self):
        first = self._issue('Save drops the draft')
        second = self._issue('Reload loses the caret')
        blocked = self.client.post(
            '/api/issue-links/',
            {'source': first.data['id'], 'target': second.data['id'], 'kind': 'blocks'},
            format='json',
        )
        self.assertEqual(blocked.status_code, 201, blocked.data)
        self.assertEqual(blocked.data['source_key'], 'EDIT-1')
        self.assertEqual(blocked.data['target_key'], 'EDIT-2')
        related = self.client.post(
            '/api/issue-links/',
            {'source': second.data['id'], 'target': first.data['id'], 'kind': 'relates'},
            format='json',
        )
        self.assertEqual(related.status_code, 201, related.data)
        self_link = self.client.post(
            '/api/issue-links/',
            {'source': first.data['id'], 'target': first.data['id'], 'kind': 'relates'},
            format='json',
        )
        self.assertEqual(self_link.status_code, 400)
        duplicate = self.client.post(
            '/api/issue-links/',
            {'source': first.data['id'], 'target': second.data['id'], 'kind': 'blocks'},
            format='json',
        )
        self.assertEqual(duplicate.status_code, 400)
        listed = self.client.get('/api/issue-links/', {'issue': second.data['id']})
        self.assertEqual(listed.data['count'], 2)
        self.assertTrue(Activity.objects.filter(issue_id=first.data['id'], kind='linked').exists())

        other = User.objects.create_user('other', 'other@example.com', 'Snagline-pass-1')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/issue-links/').data['count'], 0)
        denied = self.client.post(
            '/api/issue-links/',
            {'source': first.data['id'], 'target': second.data['id'], 'kind': 'relates'},
            format='json',
        )
        self.assertEqual(denied.status_code, 400)

    def test_templates_are_scoped_to_the_owner(self):
        created = self.client.post(
            '/api/issue-templates/',
            {
                'project': self.project.id,
                'name': 'Crash',
                'title': 'App closes unexpectedly',
                'body': 'Steps',
                'severity': 'high',
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        listed = self.client.get('/api/issue-templates/', {'project': self.project.id})
        self.assertEqual(listed.data['count'], 1)
        self.assertEqual(listed.data['results'][0]['title'], 'App closes unexpectedly')
        other = User.objects.create_user('other', 'other@example.com', 'Snagline-pass-1')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/issue-templates/').data['count'], 0)
        self.assertEqual(self.client.get(f"/api/issue-templates/{created.data['id']}/").status_code, 404)

    def test_bulk_status_updates_only_owned_issues(self):
        first = self._issue('First defect')
        second = self._issue('Second defect')
        other = User.objects.create_user('other', 'other@example.com', 'Snagline-pass-1')
        other_project = Project.objects.create(owner=other, name='Other', key='OTHR')
        foreign = Issue.objects.create(
            project=other_project,
            number=1,
            title='Foreign defect',
            reporter=other,
            status='open',
        )
        response = self.client.post(
            '/api/issues/bulk-status/',
            {'ids': [first.data['id'], second.data['id'], foreign.id], 'status': 'resolved'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertCountEqual(response.data['updated'], [first.data['id'], second.data['id']])
        self.assertEqual(Issue.objects.get(pk=first.data['id']).status, 'resolved')
        self.assertEqual(Issue.objects.get(pk=foreign.id).status, 'open')
        self.assertTrue(Activity.objects.filter(issue_id=second.data['id'], kind='status_changed').exists())
        empty = self.client.post('/api/issues/bulk-status/', {'ids': [], 'status': 'open'}, format='json')
        self.assertEqual(empty.status_code, 400)

    def test_saved_filter_comment_edit_search_and_csv(self):
        issue = self._issue('Save drops the draft', body='The textarea clears.')
        saved = self.client.post(
            '/api/saved-filters/',
            {'name': 'Open editor', 'search': 'textarea', 'status': 'open', 'project': self.project.id},
            format='json',
        )
        self.assertEqual(saved.status_code, 201, saved.data)
        comment = self.client.post(
            '/api/comments/',
            {'issue': issue.data['id'], 'body': 'Seen on the nightly build.'},
            format='json',
        )
        edited = self.client.patch(
            f"/api/comments/{comment.data['id']}/",
            {'body': 'Seen on the nightly build only.'},
            format='json',
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertIsNotNone(edited.data['edited_at'])
        self.assertEqual(Comment.objects.get(pk=comment.data['id']).body, 'Seen on the nightly build only.')
        self.assertTrue(Activity.objects.filter(kind='comment_edited').exists())
        self.assertEqual(self.client.get('/api/issues/', {'search': 'clears'}).data['count'], 1)
        self.assertEqual(self.client.get('/api/issues/', {'search': 'nightly'}).data['count'], 1)
        self.assertEqual(self.client.get('/api/issues/', {'search': 'EDIT-1'}).data['count'], 1)
        export = self.client.get('/api/issues/export/', {'status': 'open'})
        self.assertEqual(export.status_code, 200)
        self.assertIn('text/csv', export['Content-Type'])
        self.assertIn('EDIT-1', export.content.decode())
        self.assertIn('textarea clears', export.content.decode())

    def test_duplicate_title_warning_and_milestone_progress(self):
        milestone = self.client.post(
            '/api/milestones/',
            {'project': self.project.id, 'name': 'Fixes'},
            format='json',
        )
        self.assertEqual(milestone.status_code, 201, milestone.data)
        first = self._issue('Same title', milestone=milestone.data['id'], status='resolved')
        second = self._issue('Same title', milestone=milestone.data['id'])
        self.assertTrue(second.data['has_duplicate_title'])
        self.assertEqual(second.data['duplicate_titles'][0]['id'], first.data['id'])
        check = self.client.get('/api/issues/title-check/', {'project': self.project.id, 'title': 'Same title'})
        self.assertEqual(check.status_code, 200)
        self.assertEqual(len(check.data['matches']), 2)
        detail = self.client.get(f"/api/milestones/{milestone.data['id']}/")
        self.assertEqual(detail.data['total_issue_count'], 2)
        self.assertEqual(detail.data['done_issue_count'], 1)
        self.assertEqual(detail.data['progress_percent'], 50)
        self.assertEqual(detail.data['open_issue_count'], 1)

    def test_label_palette_and_issue_command(self):
        palette = self.client.get('/api/label-palette/')
        self.assertEqual(palette.status_code, 200)
        self.assertTrue(any(item['name'] == 'clay' for item in palette.data['colors']))
        label = self.client.post(
            '/api/labels/',
            {'project': self.project.id, 'name': 'blocker', 'color': 'wine'},
            format='json',
        )
        self.assertEqual(label.status_code, 201, label.data)
        self.assertEqual(label.data['color'], '#8c2f39')
        self.assertEqual(label.data['palette_name'], 'wine')
        self.assertEqual(Label.objects.get(pk=label.data['id']).color, '#8c2f39')
        output = StringIO()
        call_command(
            'issue',
            'CLI filed defect',
            '--project',
            'EDIT',
            '--owner',
            'owner',
            '--severity',
            'high',
            '--body',
            'Filed from the shell.',
            stdout=output,
        )
        self.assertIn('EDIT-', output.getvalue())
        created = Issue.objects.get(title='CLI filed defect')
        self.assertEqual(created.severity, 'high')
        self.assertEqual(created.body, 'Filed from the shell.')
        self.assertTrue(Activity.objects.filter(issue=created, kind='created').exists())

    def test_dashboard_counts_open_issues_by_severity(self):
        self._issue('Still open', severity='critical')
        self._issue('Already done', severity='critical', status='closed')
        dashboard = self.client.get('/api/dashboard/')
        self.assertEqual(dashboard.status_code, 200)
        critical_open = next(row for row in dashboard.data['open_by_severity'] if row['severity'] == 'critical')
        critical_all = next(row for row in dashboard.data['by_severity'] if row['severity'] == 'critical')
        self.assertEqual(critical_open['count'], 1)
        self.assertEqual(critical_all['count'], 2)
