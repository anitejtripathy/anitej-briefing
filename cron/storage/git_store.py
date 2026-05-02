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
        try:
            return json.loads(full_path.read_text())
        except json.JSONDecodeError:
            return []

    def append_to_json(self, relative_path: str, item: dict) -> None:
        existing = self.read_json(relative_path)
        if not isinstance(existing, list):
            existing = []
        existing.append(item)
        self.write_json(relative_path, existing)

    def commit(self, message: str, relative_paths: list[str]) -> None:
        # gitpython index.add expects paths relative to repo root, not absolute
        repo_relative = [str(Path("data") / p) for p in relative_paths]
        self.repo.index.add(repo_relative)
        if self.repo.is_dirty(index=True, working_tree=False):
            self.repo.index.commit(message)

    def commit_and_push(self, message: str, relative_paths: list[str]) -> None:
        self.commit(message, relative_paths)
        remote_names = [r.name for r in self.repo.remotes]
        if "origin" in remote_names:
            self.repo.remotes.origin.push()
