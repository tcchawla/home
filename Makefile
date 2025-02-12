.PHONY: install

install:
	cd client && npm install
	cd server && npm install

up-dev:
	docker compose -f docker-compose.yml up --build

down:
	docker compose -f docker-compose.yml down