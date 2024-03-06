require_dependency File.expand_path('../lib/wiki_fullscreen_editor/hooks.rb', __FILE__)

Redmine::Plugin.register :redmine_wiki_fullscreen_editor do
  name 'Redmine Wiki Fullscreen Editor plugin'
  author 'sk-ys'
  description 'This is a plugin for Redmine'
  version '0.0.2'
  url 'https://github.com/sk-ys/redmine_wiki_fullscreen_editor'
  author_url 'https://github.com/sk-ys'
end
