require 'zip'
require 'github_api'

task :release do
  raise "Your working directly must be clean before releasing." if !`git st`.match(/nothing to commit, working directory clean$/)

  repo_account = 'newsdev'
  app_name = File.basename(Dir.getwd)

  last_tag = `git describe --abbrev=0 --tags`.chomp.sub(/^v/, '')
  default_next_tag = last_tag.gsub(/\.(\d+)$/) { |not_needed| '.' + ($1.to_i + 1).to_s }
  puts "What release version is this? (lastest release was #{last_tag}) (defaults to #{default_next_tag})"
  STDOUT.flush
  next_tag = STDIN.gets.chomp.sub(/^v/, '')
  next_tag = default_next_tag if next_tag.length == 0

  puts "Release tag will be: #{next_tag}"

  # Jekyll docs
  config_path = File.expand_path("../_config.yml", __FILE__)
  config = File.read(config_path)

  raise "Config file does not reflect latest version. Check it first." if config.index(last_tag) < 0

  new_config = config.gsub(last_tag, next_tag).sub(/^(last_updated:\s+)\w+ \d+, \d+/) { |not_needed| $1 + Time.now.strftime("%B %-d, %Y") }
  puts "New config will be:"
  puts new_config

  puts "OK? (y/N)"
  STDOUT.flush
  resp = STDIN.gets.chomp
  raise "Quitting." if resp.downcase != 'y'

  File.write(config_path, new_config)

  # Commit the release

  puts `git add _config.yml && git commit -m "Release v#{next_tag}"`
  puts `git tag -a "v#{next_tag}" -m "v#{next_tag}"`

  puts "Created tag v#{next_tag}. Run the following to push to github? (y/N)"
  puts "git push origin --tags"

  STDOUT.flush
  resp = STDIN.gets.chomp
  raise "Quitting." if resp.downcase != 'y'

  puts `git push origin --tags`

  puts "Creating release from tag v#{next_tag}."
  github = Github.new oauth_token: ENV['GITHUB_API_TOKEN']
  release = github.repos.releases.create(repo_account, app_name, "v#{next_tag}", {
    tag_name: "v#{next_tag}",
    name: "v#{next_tag}",
    prerelease: true
  })

  # Files for Github

  zip_path = File.expand_path("../dist/#{app_name}-#{next_tag}-dist.zip", __FILE__)
  Zip::File.open(zip_path, Zip::File::CREATE) do |zipfile|
    root = File.expand_path("../dist", __FILE__)
    input_filenames = Dir.glob(File.expand_path("../dist/**/*", __FILE__)).select do |file|
      File.file?(file) && !File.basename(file).index("#{File.basename(Dir.getwd)}-")
    end
    input_filenames.each do |filename|
      puts filename.gsub(root + '/', '')
      zipfile.add(filename.gsub(root + '/', ''), filename)
    end
  end

  github.repos.releases.assets.upload(repo_account, app_name, release.id, zip_path, {
    name: File.basename(zip_path),
    content_type: "application/zip"
  })

  puts ""
  puts "Your release is available here:"
  puts "https://github.com/#{repo_account}/#{app_name}/releases/new?tag=v#{next_tag}"
end
