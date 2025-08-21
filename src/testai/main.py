#!/usr/bin/env python
import sys
import warnings
import os
import json

from datetime import datetime
from pathlib import Path

from testai.crew import Testai

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

def run():
    """
    Run the interview crew.
    """
    # Load admin offer config if present
    admin_store = Path('runtime') / 'admin_config.json'
    offer = {}
    try:
        with admin_store.open('r', encoding='utf-8') as f:
            data = json.load(f)
            offer = data.get('offer') or {}
    except Exception:
        offer = {}

    # role_title priority: CLI arg > ADMIN_STORE > env > fallback
    role_title = (
        sys.argv[1] if len(sys.argv) > 1 else
        offer.get('role_title') or os.environ.get('ROLE_TITLE', 'Offer-Not-Provided')
    )

    inputs = {
        'role_title': role_title,
        'current_year': str(datetime.now().year),
        'offer_experience_level': offer.get('experience_level'),
        'offer_tech_skills': [s.strip() for s in (offer.get('tech_skills') or '').split(',') if s.strip()],
        'offer_education': offer.get('education'),
        'offer_soft_skills': [s.strip() for s in (offer.get('soft_skills') or '').split(',') if s.strip()],
        # Optional candidate profile (can be empty; admin profile removed from UI)
        'candidate_profile': {
            'name': os.environ.get('CANDIDATE_NAME', 'Candidat(e)'),
            'years_experience': int(os.environ.get('CANDIDATE_YEARS', '0') or 0),
            'primary_stack': os.environ.get('CANDIDATE_STACK', 'Python,FastAPI').split(','),
            'location': os.environ.get('CANDIDATE_LOCATION', 'N/A'),
        }
    }
    try:
        Testai().crew().kickoff(inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")


def train():
    """
    Train the crew for a given number of iterations.
    """
    inputs = {
        'role_title': 'Senior Python Engineer',
        'current_year': str(datetime.now().year),
    }
    try:
        Testai().crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")

def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        Testai().crew().replay(task_id=sys.argv[1])

    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")

def test():
    """
    Test the crew execution and returns the results.
    """
    inputs = {
        'role_title': 'Senior Python Engineer',
        'current_year': str(datetime.now().year),
    }

    try:
        Testai().crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")
