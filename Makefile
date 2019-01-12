dev-build:
	docker-compose build

dev-run:
	docker-compose up

dev-ssh:
	docker exec -it fpscraper_web bash