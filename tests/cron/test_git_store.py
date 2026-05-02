import json
import subprocess
import pytest
from cron.storage.git_store import GitStore

@pytest.fixture
def git_data_repo(tmp_path):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / ".gitkeep").touch()
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)
    return tmp_path

def test_write_and_read_json(git_data_repo):
    store = GitStore(str(git_data_repo))
    data = [{"id": "1", "text": "test task"}]
    store.write_json("tasks/tasks.json", data)
    assert store.read_json("tasks/tasks.json") == data

def test_read_missing_file_returns_empty_list(git_data_repo):
    store = GitStore(str(git_data_repo))
    assert store.read_json("inbox/missing.json") == []

def test_commit_creates_git_commit(git_data_repo):
    store = GitStore(str(git_data_repo))
    store.write_json("tasks/tasks.json", [{"id": "1"}])
    store.commit("test: add task", ["tasks/tasks.json"])
    log = subprocess.check_output(["git", "log", "--oneline"], cwd=git_data_repo).decode()
    assert "test: add task" in log

def test_append_to_json_list(git_data_repo):
    store = GitStore(str(git_data_repo))
    store.write_json("tasks/tasks.json", [{"id": "1"}])
    store.append_to_json("tasks/tasks.json", {"id": "2"})
    result = store.read_json("tasks/tasks.json")
    assert len(result) == 2 and result[1]["id"] == "2"
