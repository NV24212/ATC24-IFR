import os
import sys
import unittest
from unittest.mock import patch
from flask import session

# Add the parent directory to the Python path to allow for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend import create_app

class TestAuth(unittest.TestCase):
    @patch('backend.init_db')
    def setUp(self, mock_init_db):
        """Set up a test client for the Flask application."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        self.client = app.test_client()

    def test_discord_login_redirect(self):
        """
        Tests that the /auth/discord route redirects to the Discord authorization URL.
        """
        with self.client:
            response = self.client.get('/auth/discord')
            self.assertEqual(response.status_code, 302)
            self.assertTrue(response.location.startswith('https://discord.com/api/oauth2/authorize'))

    @patch('backend.auth.track_page_visit')
    def test_get_current_user_unauthenticated(self, mock_track_page_visit):
        """
        Tests that the /api/auth/user endpoint returns an unauthenticated status
        when no user is logged in.
        """
        with self.client:
            response = self.client.get('/api/auth/user')
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertFalse(data['authenticated'])
            self.assertIsNone(data['user'])
            mock_track_page_visit.assert_called_once()

    @patch('backend.auth.track_page_visit')
    def test_logout(self, mock_track_page_visit):
        """
        Tests that the /api/auth/logout endpoint successfully clears the user session.
        """
        with self.client:
            # First, simulate a logged-in user by setting a session variable
            with self.client.session_transaction() as sess:
                sess['user'] = {'username': 'testuser', 'discord_id': '12345'}

            # Now, call the logout endpoint
            response = self.client.post('/api/auth/logout')
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertTrue(data['success'])

            # Verify that the session is now empty
            response = self.client.get('/api/auth/user')
            data = response.get_json()
            self.assertFalse(data['authenticated'])
            self.assertIsNone(data['user'])
            # The user endpoint is called once after logout, so the page visit should be tracked
            mock_track_page_visit.assert_called_once()

if __name__ == '__main__':
    unittest.main()