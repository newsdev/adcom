link:
	bower link adcom

unlink:
	bower unlink adcom

run:
	int startprocess . "grunt watch" 1
	int startprocess . "jekyll serve --watch" 1

release.bump_version:
	# Gets env variables: last_tag and next_tag
	@grunt
	@rake release:bump_version last_tag=${last_tag} next_tag=${next_tag}

release.after_create:
	# Gets env variables: last_tag and next_tag
	@rake release:after_create last_tag=${last_tag} next_tag=${next_tag}
