import pm2 from 'pm2'

export default function () {
  console.log('mounting to pm2 process...')
  pm2.connect(err => {
    if (err) {
      console.error(err)
      process.exit(2)
    }

    pm2.start({
      name: 'jobqueue',
      script: './lib/server/index.js',
    }, (err, apps) => {
      pm2.disconnect()
      if (err) throw err
    })
  })
}