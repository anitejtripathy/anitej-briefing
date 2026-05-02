.PHONY: install run-frontend test ooo-catchup

install:
	python -m venv venv && . venv/bin/activate && pip install -r requirements.txt
	@[ -f frontend/package.json ] && (cd frontend && npm install) || echo "frontend not yet scaffolded — skipping npm install"

run-frontend:
	cd frontend && npm run dev

test:
	. venv/bin/activate && pytest tests/ -v

ooo-catchup:
	. venv/bin/activate && python -m cron.processors.ooo_catchup
