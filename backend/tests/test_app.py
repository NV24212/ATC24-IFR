import os
import sys
import unittest
from unittest.mock import patch

# Add the parent directory to the Python path to allow for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend import create_app

class TestApp(unittest.TestCase):
    @patch('backend.init_db')
    def test_app_creation(self, mock_init_db):
        """
        Tests that the Flask app can be created without errors.
        """
        # The init_db function is mocked to prevent it from running during the test
        app = create_app()
        self.assertIsNotNone(app)
        mock_init_db.assert_called_once()

if __name__ == '__main__':
    unittest.main()