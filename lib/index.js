
const { src,dest,series,parallel,watch } = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
const bs = browserSync.create()
const cwd = process.cwd()
let config = {
  // default config
  build:{
    src:"src",
    dist:"dist",
    temp:"temp",
    paths:{
      scssStyle: '**/*.scss',
      cssmin: '**/*.css',
      scripts: ['**/*.js','!**/*.min.js'],
      pages:['**/*.html','!lib/**/*.html'],
      images:'**/*.{png,jpg,gif,ico}',
      fonts:'fonts/**',
      extra:['**/*.min.js','lib/**/*.html']
    },

  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({},config,loadConfig)
} catch (error) {
  
}
const clean = ()=>{
  return del([config.build.dist,config.build.temp])
}
// 转换scss 压缩css
const scssStyle = () =>{
  return src(config.build.paths.scssStyle,{base: config.build.src,cwd:config.build.src})
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
}

// css 插件lib文件夹是一个静态插件，里边已经压缩过了css
const cssmin = () =>{
  return src(config.build.paths.cssmin,{base: config.build.src,cwd:config.build.src})
    .pipe(dest(config.build.temp))
}

// js 脚本文件es6编译 插件lib文件夹是一个静态插件，不需要，所以排除，一会复制到dist
const script = () =>{
  return src(config.build.paths.scripts,{base: config.build.src,cwd:config.build.src})
  .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
  .pipe(dest(config.build.temp))
}

// html 压缩
const page = () => {
  return src(config.build.paths.pages,{base: config.build.src,cwd:config.build.src})
  .pipe(dest(config.build.temp))
}

// 图片转换
const image = () =>{
  return src(config.build.paths.images,{base: config.build.src,cwd:config.build.src})
  .pipe(plugins.imagemin())
  .pipe(dest(config.build.dist))
}

// 字体转换
const font = () =>{
  return src(config.build.paths.fonts,{base: config.build.src,cwd:config.build.src})
  .pipe(plugins.imagemin())
  .pipe(dest(config.build.dist))
}

// 其它文件拷贝一下

const extra = () =>{
  return src(config.build.paths.extra,{base: config.build.src,cwd:config.build.src})
  .pipe(dest(config.build.dist))
}

// 服务器 热更新
const serve = () => {
  watch(config.build.paths.scssStyle,{cwd:config.build.src},scssStyle)
  watch(config.build.paths.cssmin,{cwd:config.build.src},cssmin)
  watch(config.build.paths.scripts,{cwd:config.build.src},script)
  watch(config.build.paths.pages,{cwd:config.build.src},page)
  // 文件变化后只刷新浏览器，不构建
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ],{cwd:config.build.src},bs.reload)
  // 参数是数组，单独拿出来，否则会报错
  watch(config.build.paths.extra,{cwd:config.build.src},bs.reload)

  bs.init({
    notify:false,
    port: 7788,
    open:false,
    files: config.build.temp+'/**', // 监听的变化文件路径,及时刷新浏览器
    server: {
      baseDir:[config.build.temp,config.build.src], // 文件请求根目录，以此查找，直到找到数组，为了减少构建次数
      routes:{
      '/node_modules':'node_modules'  // 路由映射，如果页面引入了node_modules的文件会默认找这里
     }
    }
  })
}

// // 处理依赖，将有构建注释的代码打包到一个文件
const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}
// 编译任务，并行
const compile = parallel(scssStyle,cssmin,script,page)

// 上线之前的任务，串行里边包含了并行
const build = series(
  clean,
  parallel(
  series(compile,useref),
  image,
  font,
  extra
  ))

const develop = series(compile,serve)

// 监听文件变化

module.exports = {
  clean,
  build,
  develop
}