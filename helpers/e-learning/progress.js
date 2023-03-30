const cosmos = require('../services/cosmos');
const errorAppInsights = require('../error/appInsights');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const elearningRegistration = require('../e-learning/registration');
const certificationDatabase = require('../certification/database');
const { getUser } = require('../e-learning/user');
const { isCodenameInMultipleChoice } = require('../general/helper');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const registrationIdExistsInDb = async (db, id) => {
  const query = {
    query: 'SELECT * FROM c WHERE c.registrationId = @id',
    parameters: [{
      name: '@id',
      value: id
    }]
  };
  const { resources } = await db.items.query(query).fetchAll();
  if (resources && resources.length) return resources[0];
  return null;
};

const createProgress = (payload, registration) => {
  if (!payload) return null;

  const progress = {
    _partitionKey: payload.learner?.id?.toLowerCase() || null,
    registrationId: payload.id || null,
    courseId: payload.course?.id || null,
    courseTitle: payload.course?.title || null,
    status: payload.activityDetails?.activityCompletion || null,
    firstAccessDate: payload.firstAccessDate || null,
    lastAccessDate: payload.lastAccessDate || null,
    completedDate: payload.completedDate || null
  };

  if (registration) {
    progress.firstAccessDate = registration.firstAccessDate;
    progress.id = registration.id;

    if (registration.status === 'COMPLETED') {
      progress.status = registration.status;
      progress.completedDate = registration.completedDate;
    }
  }

  return progress;
};

const setRecord = async (payload) => {
  const db = await cosmos.initDatabase(process.env.COSMOSDB_CONTAINER_PROGRESS);
  const registration = await registrationIdExistsInDb(db, payload.id);

  try {
    if (registration) {
      const itemToUpdate = await db.item(registration.id);
      const progress = createProgress(payload, registration);
      await itemToUpdate.replace(progress);
    } else {
      const progress = createProgress(payload);
      await db.items.create(progress);
    }
    return true;
  } catch (error) {
    errorAppInsights.log('COSMOSDB_ERROR', error);
    return false;
  }
};

const mergeCoursesWithProgress = (courses, registrations) => {
  const coursesWithProgress = [];
  courses.forEach((course) => {
    const courseWithProgress = {
      title: course.elements.title.value,
      topic: course.elements.personas___topics__training_topic.value,
      progress: null
    };
    registrations.forEach((registration) => {
      if (course.system.id === registration.courseId.replace('dev_', '').replace('_preview', '')) {
        courseWithProgress.progress = registration.status;
        if (registration.completedDate) {
          courseWithProgress.completedDate = registration.completedDate;
          courseWithProgress.completedDateFormatted = dayjs.tz(registration.completedDate).format('MMMM D, YYYY');
        }
      }
    });
    coursesWithProgress.push(courseWithProgress);
  });

  return coursesWithProgress;
};

const filterCorsesByUserAccesLevel = (courses, userAccessLevel) => {
  return courses.filter((course) => {
    const courseAccessLevel = course.elements.access.value[0].codename;
    switch (courseAccessLevel) {
      case 'free':
      case 'clients_partners_employees':
        return true;
      case 'partners_employees':
        if (userAccessLevel.partner || userAccessLevel.employee) return true;
        return false;
      case 'employees':
        if (userAccessLevel.employee) return true;
        return false;
      default:
        return false;
    }
  });
};

const getUserProgress = async (req, res) => {
  if (!(req.user && req.user.email)) return { error: 'User not sign in.' };

  const user = await getUser(req.user.email, false, res);

  let courses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });

  courses = filterCorsesByUserAccesLevel(courses, user.accessLevel)

  const trainingTopicTaxonomyGroup = await cacheHandle.evaluateSingle(res, 'trainingTopicTaxonomyGroup', async () => {
    return await getContent.trainingTopicTaxonomyGroup(res);
  });

  const userRegistrations = await elearningRegistration.getUserRegistrations(req.user.email, res);

  const coursesWithProgress = mergeCoursesWithProgress(courses, userRegistrations);

  const topics = trainingTopicTaxonomyGroup.taxonomy.terms.map((topic) => {
    const coursesTotal = coursesWithProgress
      .filter((course) => isCodenameInMultipleChoice(course.topic, topic.codename));

    if (!coursesTotal.length) return null;
    return {
      codename: topic.codename,
      name: topic.name,
      coursesTotal: coursesTotal.length,
      coursesCompleted: coursesTotal
        .filter((course) => course.progress === 'COMPLETED')
        .length
    };
  });

  return {
    topics: topics.filter((topic) => topic),
    isAdmin: !!user.subscriptionServiceAdmin && user.subscriptionServiceAdmin.length
  }
};

const getSubscriptionReport = async (user, res) => {
  if (!user.subscriptionServiceAdmin) return null;

  const courses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });

  await Promise.all(user.subscriptionServiceAdmin.map(async (item) => {
    const userRegistrations = await elearningRegistration.getUserRegistrations(item.email, res);
    const coursesWithProgress = mergeCoursesWithProgress(courses, userRegistrations).filter(item => item.progress);
    item.courses = coursesWithProgress;
  }));

  const certificationTests = await cacheHandle.evaluateSingle(res, 'trainingCertificationTests', async () => {
    return await getContent.certificationTest(res);
  });

  await Promise.all(user.subscriptionServiceAdmin.map(async (item) => {
    item.certifications = [];

    for await (const test of certificationTests.items) {
      const attempt = await certificationDatabase.getLatestAttempt({
        email: item?.email,
        codename: test.system.codename
      });
      if (attempt && !dayjs.tz(dayjs.tz()).isAfter(dayjs.tz(attempt.certificate_expiration))) {
        item.certifications.push({
          title: attempt.test.title,
          email: attempt.email,
          expiration: attempt.certificate_expiration ? attempt.certificate_expiration : null,
          expirationFormatted: attempt.certificate_expiration ? dayjs.tz(attempt.certificate_expiration).format('MMMM D, YYYY') : null,
          date: attempt.start,
          dateFormatted: dayjs.tz(attempt.start).format('MMMM D, YYYY')
        })
      }
    }
  }));

  return user.subscriptionServiceAdmin;
}

module.exports = {
  getUserProgress,
  setRecord,
  getSubscriptionReport
};
