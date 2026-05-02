import json
from pathlib import Path
from git import Repo


class GitStore:
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.repo = Repo(repo_path)
        self.data_path = self.repo_path / "data"

    def write_json(self, relative_path: str, data: list | dict) -> Path:
        full_path = self.data_path / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(json.dumps(data, indent=2, default=str))
        return full_path

    def read_json(self, relative_path: str) -> list | dict:
        full_path = self.data_path / relative_path
        if not full_path.exists():
            return []
        return json.loads(full_path.read_text())

    def append_to_json(self, relative_path: str, item: dict) -> None:
        existing = self.read_json(relative_path)
        if not isinstance(existing, list):
            existing = []
        existing.append(item)
        self.write_json(relative_path, existing)

    def commit(self, message: str, relative_paths: list[str]) -> None:
        abs_paths = [str(self.data_path / p) for p in relative_paths]
        self.repo.index.add(abs_paths)
        if self.repo.is_dirty(index=True, working_tree=False):
            self.repo.index.commit(message)

    def commit_and_push(self, message: str, relative_paths: list[str]) -> None:
        self.commit(message, relative_paths)
        if self.repo.remotes:
            self.repo.remotes.origin.push()
