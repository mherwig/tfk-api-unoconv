'use strict'

const fs = require('fs')
const uuid = require('uuid')
const unoconv = require('unoconv3')
const formats = require('../lib/data/formats.json')
const pkg = require('../package.json')

module.exports.handleUpload = (request, reply) => {
  const convertToFormat = request.params.format
  const data = request.payload
  if (data.file) {
    const nameArray = data.file.hapi.filename.split('.')
    const fileEndingOriginal = nameArray.pop()
    const temporaryName = uuid.v4()
    const pathPre = process.cwd() + '/uploads/' + temporaryName
    const fileNameTempOriginal = pathPre + '.' + fileEndingOriginal
    const file = fs.createWriteStream(fileNameTempOriginal)
    
    let filters = []
    if (data.filter) {
      filters = Array.isArray(data.filter) ? data.filter : [data.filter]
    }
    
    const options = {filters}

    file.on('error', (error) => {
      console.error(error)
    })

    data.file.pipe(file)

    data.file.on('end', (err) => {
      if (err) {
        console.error(err)
        reply(err)
      } else {
        unoconv.convert(fileNameTempOriginal, convertToFormat, options, (err, result) => {
          if (err) {
            console.error(err)
            fs.unlink(fileNameTempOriginal, error => {
              if (error) {
                console.error(error)
              } else {
                console.log(`${fileNameTempOriginal} deleted`)
              }
            })
            reply(err)
          } else {
            console.log('finished converting')
            reply(result)
              .on('finish', () => {
                fs.unlink(fileNameTempOriginal, error => {
                  if (error) {
                    console.error(error)
                  } else {
                    console.log(`${fileNameTempOriginal} deleted`)
                  }
                })
              })
          }
        })
      }
    })
  }
}

module.exports.showFormats = (request, reply) => {
  reply(formats)
}

module.exports.showFormat = (request, reply) => {
  const params = request.params
  const format = params ? formats[request.params.type] : false
  if (!format) {
    reply('Format type not found').code(404)
  } else {
    reply(format)
  }
}

module.exports.showVersions = (request, reply) => {
  let versions = {}
  Object.keys(pkg.dependencies).forEach((item) => {
    versions[item] = pkg.dependencies[item]
  })
  reply(versions)
}

module.exports.healthcheck = (request, reply) => {
  reply({uptime: process.uptime()})
}
