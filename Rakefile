require 'zip'
require 'github_api'

namespace :release do
  task :bump_version do
    config_path = File.expand_path("../_config.yml", __FILE__)
    new_config = File.read(config_path).gsub(ENV['last_tag'], ENV['next_tag']).sub(/^(last_updated:\s+)\w+ \d+, \d+/) { |not_needed| $1 + Time.now.strftime("%B %-d, %Y") }
    File.write(config_path, new_config)
  end

  task :after_create do
    puts "Creating release from tag v#{ENV['next_tag']}."
    github = Github.new oauth_token: ENV['GITHUB_API_TOKEN']
    release = github.repos.releases.create('newsdev', 'adcom', "v#{ENV['next_tag']}", {
      tag_name: "v#{ENV['next_tag']}",
      name: "v#{ENV['next_tag']}",
      prerelease: true
    })

    # Files for Github
    zip_path = File.expand_path("../dist/adcom-#{ENV['next_tag']}-dist.zip", __FILE__)
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

    github.repos.releases.assets.upload('newsdev', 'adcom', release.id, zip_path, {
      name: File.basename(zip_path),
      content_type: "application/zip"
    })
  end
end
