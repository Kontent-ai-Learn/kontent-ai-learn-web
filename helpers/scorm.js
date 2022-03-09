const axios = require('axios');
const CryptoJS = require('crypto-js');
const isPreview = require('./isPreview');
const getUrlMap = require('./urlMap');
const handleCache = require('./handleCache');
const helper = require('./helperFunctions');
const commonContent = require('./commonContent');

const settings = {
  auth: {
      username: process.env.SCORM_APP_ID || '',
      password: process.env.SCORM_SECRET_KEY || ''
  },
  registrationsUrl: `https://${process.env.SCORM_HOST}/api/v2/registrations`,
  coursesUrl: `https://${process.env.SCORM_HOST}/api/v2/courses`,
};

const handleEmptyErrorResponse = (response, requestUrl) => {
  return response ? { message: response.data.error || response.data.message } : { message: `Invalid request to ${requestUrl}` };
};

const getRegistrationId = (email, courseId) => {
  return CryptoJS.MD5(`${email}${courseId}`).toString();
};

const getRegistrationExistence = async (registrationId) => {
  let exists = true;
  const url = `${settings.registrationsUrl}/${registrationId}`;
  try {
      await axios({
          method: 'head',
          url: `${url}`,
          auth: settings.auth
      });
  } catch (err) {
    exists = false;
  }

  return exists;
};

const createRegistration = async (user, courseId, registrationId) => {
  const registration = {};
  const url = `${settings.registrationsUrl}`;
  const data = {
    courseId: courseId,
    registrationId: registrationId,
    learner: {
      id: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    }
  };

  try {
    await axios({
      method: 'post',
      url: url,
      data: data,
      auth: settings.auth
    });
  } catch (error) {
    registration.err = handleEmptyErrorResponse(error.response, url);
    registration.err.userEmail = user.email;
    registration.err.file = 'helpers/scorm.js';
    registration.err.method = 'createRegistration';
  }

  return registration;
};

const getRegistrationData = async (registrationId) => {
  const url = `${settings.registrationsUrl}/${registrationId}`;
  let registrationData = {};

  try {
    const registration = await axios({
        method: 'get',
        url: url,
        auth: settings.auth
    });

    registrationData = registration.data;
  } catch (error) {
    registrationData.err = handleEmptyErrorResponse(error.response, url);
    registrationData.err.registrationId = registrationId;
    registrationData.err.file = 'helpers/scorm.js';
    registrationData.err.method = 'getRegistrationData';
  }

  return registrationData;
};

const getRegistrationLink = async (registrationId, codename, res) => {
  const url = `${settings.registrationsUrl}/${registrationId}/launchLink`;
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const redirectUrl = urlMap.find(item => item.codename === codename);

  const data = {
    expiry: 120,
    redirectOnExitUrl: `${helper.getDomain()}${redirectUrl?.url}`,
  };
  let linkData = {};

  try {
    const link = await axios({
      method: 'post',
      url: url,
      data: data,
      auth: settings.auth
    });
    linkData = link.data;
  } catch (error) {
    linkData.err = handleEmptyErrorResponse(error.response, url);
    linkData.err.registrationId = registrationId;
    linkData.err.file = 'helpers/scorm.js';
    linkData.err.method = 'getRegistrationLink';
  }

  return linkData;
};

const getCoursePreviewLink = async (courseId, codename, res) => {
  const url = `${settings.coursesUrl}/${courseId}/preview`;
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const redirectUrl = urlMap.find(item => item.codename === codename);

  const data = {
    expiry: 120,
    redirectOnExitUrl: `${helper.getDomain()}${redirectUrl?.url}`,
  };
  let linkData = {};

  try {
    const link = await axios({
      method: 'post',
      url: url,
      data: data,
      auth: settings.auth
    });
    linkData = link.data;
  } catch (error) {
    linkData.err = handleEmptyErrorResponse(error.response, url);
    linkData.err.courseId = courseId;
    linkData.err.file = 'helpers/scorm.js';
    linkData.err.method = 'getCoursePreviewLink';
  }

  return linkData;
};

const getCertificate = (progress) => {
  if (progress === 'COMPLETED') {
    // Fake cerificate
    return {
      course_id: '193',
      course_name: 'Get Started with Modular Content',
      unique_id: '795f-7fb9-d421-2fec',
      issued_date: '2020/12/28',
      issued_date_timestamp: 1609147583,
      expiration_date: 'Never',
      expiration_date_timestamp: 0,
      download_url: 'https://kontent-kentico.talentlms.com/user/downloadcertification/id:8573',
      public_url: 'https://training.kentico.com/user/certification/sig:uPhkqu_BsLdV_5tK1dGvwg.RjR5ZmExOGI5OWtYUWg4TGlDSForQT09'
    };
  }
  return null;
};

const getCompletion = (codename, UIMessages) => {
  switch (codename) {
    case 'PREVIEW': return UIMessages.training___course_status_preview.value
    case 'COMPLETED': return UIMessages.training___course_status_completed.value;
    case 'INCOMPLETE': return UIMessages.training___course_status_incomplete.value;
    default: return UIMessages.training___course_status_unknown.value;
  }
}

const getCourseId = (course, res) => {
  let courseId = course?.course_id?.value?.[0].codename;

  if (isPreview(res.locals.previewapikey)) {
    courseId = `${courseId}_preview`;
  }

  if (process.env.isDevelopment === 'true') {
    courseId = `dev_${courseId}`;
  }

  return courseId;
};

const scorm = {
  handleTrainingCourse: async (user, course, req, res) => {
    const courseId = getCourseId(course, res);
    let registrationData = null;
    let linkData = null;
    let certificate = null;
    let qs = null;
    let url = null;
    let progress = null;

    const UIMessages = await handleCache.ensureSingle(res, 'UIMessages', async () => {
      return await commonContent.getUIMessages(res);
    });

    if (!isPreview(res.locals.previewapikey)) {
      const registrationId = getRegistrationId(user.email, courseId);
      const registrationExists = await getRegistrationExistence(registrationId);

      if (!registrationExists) {
        if (typeof req.query.enroll === 'undefined') {
          qs = 'enroll';
        } else {
          const registrationCreated = await createRegistration(user, courseId, registrationId);

          if (registrationCreated.err) {
            return {
              url: '#',
              completion: 101,
              err: registrationCreated.err
            }
          }
        }
      }

      if (!qs) {
        registrationData = await getRegistrationData(registrationId);

        if (registrationData.err) {
          return {
            url: '#',
            completion: 102,
            err: registrationData.err
          }
        }

        progress = registrationData?.activityDetails?.activityCompletion;

        linkData = await getRegistrationLink(registrationId, course.system.codename, res);

        if (linkData.err) {
          return {
            url: '#',
            completion: 103,
            err: linkData.err
          }
        }

        url = linkData?.launchLink;

        certificate = getCertificate(progress);
      }
    } else {
      progress = 'PREVIEW';
      linkData = await getCoursePreviewLink(courseId, course.system.codename, res);

      if (linkData.err) {
        return {
          url: '#',
          completion: 103,
          err: linkData.err
        }
      }

      url = linkData?.launchLink;
    }

    return {
      url: url,
      completion: getCompletion(progress, UIMessages[0]),
      certificate: certificate,
      qs: qs,
      target: '_self'
    }
  }
}

module.exports = scorm;
