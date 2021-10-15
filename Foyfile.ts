import { task, setGlobalOptions } from 'foy'

setGlobalOptions({ loading: false, strict: true })

task('build', async ctx => {
  await Promise.all([
    ctx.exec('tsc'),
    ctx.exec('tsc -m esnext --outDir es'),
  ])
})


task('test', async ctx => {
  console.log('test')
  await ctx.exec(`jasmine --require=ts-node/register "./src/test/**.test.ts"`)
})

task('publish', async ctx => {
  await ctx.exec([
    'foy test',
    'foy build',
    'git add -A',
    'git commit -m "build"',
    'npm version patch',
    'npm publish --registry=https://registry.npmjs.org/',
    'git push upstream master --tags'
  ])
})
