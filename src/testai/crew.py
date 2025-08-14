import os
from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
from testai.tools.rag_tool import RAGSearchTool
from testai.tools.ask_candidate_tool import AskCandidateTool
from testai.tools.sim_candidate_tool import SimulatedCandidateTool
from testai.tools.web_ask_tool import WebAskCandidateTool

@CrewBase
class Testai():
    """Testai crew - Entretien technique multi-agents avec RAG"""

    agents: List[BaseAgent]
    tasks: List[Task]

    def _llm(self) -> LLM:
        """Configure Gemini via env (.env): GEMINI_API_KEY or GOOGLE_API_KEY required.
        Optionally set model via GEMINI_MODEL or MODEL (default: 'gemini-2.0-flash')."""
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError('Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment (.env).')
        raw_model = os.getenv('GEMINI_MODEL') or os.getenv('MODEL') or 'gemini-2.0-flash'
        model = raw_model if '/' in raw_model else f'gemini/{raw_model}'
        return LLM(model=model, api_key=api_key)

    # Agents
    def _tools_for_qna(self):
        # Choose candidate interaction tool based on env switch
        use_web = os.getenv('USE_WEB_UI', '0') in ('1', 'true', 'True')
        if use_web:
            return [WebAskCandidateTool()]
        return [AskCandidateTool(), SimulatedCandidateTool()]

    @agent
    def intro_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['intro_agent'],  # type: ignore[index]
            tools=self._tools_for_qna(),
            llm=self._llm(),
            verbose=True
        )

    @agent
    def tech_interviewer(self) -> Agent:
        return Agent(
            config=self.agents_config['tech_interviewer'],  # type: ignore[index]
            tools=[RAGSearchTool(knowledge_dir='knowledge')] + self._tools_for_qna(),
            llm=self._llm(),
            verbose=True,
            allow_delegation=False
        )

    @agent
    def softskills_interviewer(self) -> Agent:
        return Agent(
            config=self.agents_config['softskills_interviewer'],  # type: ignore[index]
            tools=self._tools_for_qna(),
            llm=self._llm(),
            verbose=True
        )

    @agent
    def analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['analyst_agent'],  # type: ignore[index]
            llm=self._llm(),
            verbose=True
        )

    @agent
    def reporter_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['reporter_agent'],  # type: ignore[index]
            llm=self._llm(),
            verbose=True
        )

    # Tasks
    @task
    def intro_task(self) -> Task:
        return Task(
            config=self.tasks_config['intro_task'],  # type: ignore[index]
        )

    @task
    def tech_qna_task(self) -> Task:
        return Task(
            config=self.tasks_config['tech_qna_task'],  # type: ignore[index]
        )

    @task
    def softskills_qna_task(self) -> Task:
        return Task(
            config=self.tasks_config['softskills_qna_task'],  # type: ignore[index]
        )

    @task
    def analysis_scoring_task(self) -> Task:
        return Task(
            config=self.tasks_config['analysis_scoring_task'],  # type: ignore[index]
        )

    @task
    def report_task(self) -> Task:
        return Task(
            config=self.tasks_config['report_task'],  # type: ignore[index]
            output_file='interview_report.md'
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Interview crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
