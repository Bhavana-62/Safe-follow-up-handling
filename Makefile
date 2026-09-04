.PHONY: up bootstrap down reset ask eval test

up:
	docker compose -f platform/docker-compose.yml up -d

down:
	docker compose -f platform/docker-compose.yml down

bootstrap:
	python seeds/seed.py

test:
	pytest -v

eval:
	pytest -v tests/test_worked_examples.py tests/test_session_followup_entitlements.py tests/test_definition_of_done.py

ask:
	python src/cli.py "What's our refund window for damaged goods?" --as-user dana.reyes
