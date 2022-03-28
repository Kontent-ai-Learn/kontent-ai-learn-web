const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');
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

const getRegistrationLinkEndpoint = (id, req) => {
    return `${(req.headers.referrer || req.headers.referer)?.split('?')[0]}?id=${id}`;
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

const getRegistrationLink = async (registrationId, surveyCodename, courseId, res) => {
  const url = `${settings.registrationsUrl}/${registrationId}/launchLink`;
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const redirectUrl = urlMap.find(item => item.codename === surveyCodename);

  const data = {
    expiry: 300,
    redirectOnExitUrl: `${helper.getDomain()}${redirectUrl?.url}?courseid=${courseId}`,
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

const getCoursePreviewLink = async (courseId, surveyCodename, res) => {
  const url = `${settings.coursesUrl}/${courseId}/preview`;
  const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const redirectUrl = urlMap.find(item => item.codename === surveyCodename);

  const data = {
    expiry: 300,
    redirectOnExitUrl: `${helper.getDomain()}${redirectUrl?.url}?courseid=${courseId}`,
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

const getCertificate = (registrationData, course) => {
  if (registrationData?.activityDetails?.activityCompletion === 'COMPLETED') {
    return {
      course_id: registrationData.course.id,
      course_name: course.title.value,
      issued_date: moment(registrationData.completedDate).format('YYYY/MM/DD'),
      expiration_date: null,
      public_url: `/learn/get-certified/course/${registrationData.id}/certificate/`
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
  getTrainingRegistrationLink: async (id, codename, res) => {
    let linkData = null;
    const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
      return await commonContent.getTraniningCourse(res);
    });
    const course = trainingCourses.find(item => item.system.codename === codename);

    if (isPreview(res.locals.previewapikey)) {
      linkData = await getCoursePreviewLink(id, course.course_survey.value?.[0]?.system?.codename, res);
    } else {
      linkData = await getRegistrationLink(id, course.course_survey.value?.[0]?.system?.codename, getCourseId(course, res), res);
    }

    if (linkData?.launchLink) {
      return linkData.launchLink;
    }

    return null;
  },
  getRegistrationIdData: async (registrationId) => {
    const registrationExists = await getRegistrationExistence(registrationId);

    if (registrationExists) {
      return await getRegistrationData(registrationId);
    }

    return null;
  },
  getUserCourseRegistration: async (email, courseId) => {
    const registrationId = getRegistrationId(email, courseId);
    const registrationExists = await getRegistrationExistence(registrationId);

    if (registrationExists) {
      return await getRegistrationData(registrationId);
    }

    return null;
  },
  handleTrainingCourse: async (user, course, req, res) => {
    const courseId = getCourseId(course, res);
    let registrationData = null;
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
        url = getRegistrationLinkEndpoint(registrationId, req);
        certificate = getCertificate(registrationData, course);
      }
    } else {
      progress = 'PREVIEW';
      url = getRegistrationLinkEndpoint(courseId, req);
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
