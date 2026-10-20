from django.contrib.auth.models import User
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
