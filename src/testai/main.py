#!/usr/bin/env python
import sys
import warnings
import os

from datetime import datetime

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
    # role_title is provided manually by the user (first CLI arg) to avoid RAG influencing the offer type.
    role_title = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ROLE_TITLE', 'Offer-Not-Provided')
    inputs = {
        'role_title': role_title,
        'current_year': str(datetime.now().year),
        # Optional candidate profile passed manually or via env for testing
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
