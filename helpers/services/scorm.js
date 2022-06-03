const axios = require('axios');
const CryptoJS = require('crypto-js');
const cacheHandle = require('../cache/handle');
const { getDomain } = require('../general/helper');
const getContent = require('../kontent/getContent');
const isPreview = require('../kontent/isPreview');

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
  return {
    lowerCase: CryptoJS.MD5(`${email.toLowerCase()}${courseId}`).toString(),
    normalCase: CryptoJS.MD5(`${email}${courseId}`).toString(),
  }
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

const getCorrectCaseRegistrationId = async (registrationId) => {
  if (!registrationId) return null;
  const registrationExistsLower = await getRegistrationExistence(registrationId.lowerCase);
  const registrationExistsNormal = await getRegistrationExistence(registrationId.normalCase);
  let registrationIdCorrect = null;

  if (registrationExistsNormal) registrationIdCorrect = registrationId.normalCase;
  if (registrationExistsLower) registrationIdCorrect = registrationId.lowerCase;

  return registrationIdCorrect;
};

const createRegistration = async (user, courseId, registrationId) => {
  const registration = {};
  const url = `${settings.registrationsUrl}`;
  let baseURL = process.env.baseURL;
  if (process.env.ngrok) baseURL = process.env.ngrok;
  const data = {
    courseId: courseId,
    registrationId: registrationId,
    learner: {
      id: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    },
    postback: {
      url: `${baseURL}/learn/api/scorm/postback/`,
      resultsFormat: 'course',
      legacy: false,
      authType: 'httpbasic',
      userName: process.env.SCORM_USERNAME,
      password: process.env.SCORM_USERPWD
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

const getRegistrationLink = async (registrationId, courseId) => {
  const url = `${settings.registrationsUrl}/${registrationId}/launchLink`;
  const redirectUrl = '/learn/survey/';

  const data = {
    expiry: 300,
    redirectOnExitUrl: `${getDomain()}${redirectUrl}?courseid=${courseId}`,
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

const getCoursePreviewLink = async (courseId) => {
  const url = `${settings.coursesUrl}/${courseId}/preview`;
  const redirectUrl = '/learn/survey/';

  const data = {
    expiry: 300,
    redirectOnExitUrl: `${getDomain()}${redirectUrl}?courseid=${courseId}`,
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

const getCourseId = (course, res) => {
  let courseId = course?.system.id;

  if (isPreview(res.locals.previewapikey)) {
    courseId = `${courseId}_preview`;
  }

  if (process.env.isDevelopment === 'true') {
    courseId = `dev_${courseId}`;
  }

  return courseId;
};

const scorm = {
  getRegistrationIdData: async (registrationId) => {
    const registrationExists = await getRegistrationExistence(registrationId);

    if (registrationExists) {
      return await getRegistrationData(registrationId);
    }

    return null;
  },
  getUserCourseRegistration: async (email, courseId) => {
    const registrationId = getRegistrationId(email, courseId);
    const registrationIdCorrect = await getCorrectCaseRegistrationId(registrationId);

    if (registrationIdCorrect) {
      return await getRegistrationData(registrationIdCorrect);
    }

    return null;
  },
  createRegistrationLink: async (user, courseId, res) => {
    let linkData = null;
    const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
      return await getContent.trainingCourse(res);
    });
    const course = trainingCourses.find(item => item.system.id === courseId);
    const scormCourseId = getCourseId(course, res);

    if (!isPreview(res.locals.previewapikey)) {
      const registrationId = getRegistrationId(user.email, scormCourseId);
      let registrationIdCorrect = await getCorrectCaseRegistrationId(registrationId);

      if (!registrationIdCorrect) {
        registrationIdCorrect = registrationId.lowerCase;
        await createRegistration(user, scormCourseId, registrationIdCorrect);
      }

      linkData = await getRegistrationLink(registrationIdCorrect, scormCourseId, res);
    } else {
      linkData = await getCoursePreviewLink(scormCourseId);
    }

    if (linkData?.launchLink) {
      return linkData.launchLink;
    }

    return null;
  }
}

module.exports = scorm;
