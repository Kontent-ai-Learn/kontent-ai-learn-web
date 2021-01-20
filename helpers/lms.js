const axios = require('axios');
const generator = require('generate-password');
const consola = require('consola');
const FormData = require('form-data');

const settings = {
    branchId: '5',
    auth: {
        username: process.env['LMS.id'] || '',
        password: ''
    },
    coursesUrl: `https://${process.env['LMS.host']}/api/v1/courses`,
    registerUrl: `https://${process.env['LMS.host']}/api/v1/usersignup`,
    addToCourseUrl: `https://${process.env['LMS.host']}/api/v1/addusertocourse`,
    getUserByEmailUrl: `https://${process.env['LMS.host']}/api/v1/users/email`,
    statusUrl: `https://${process.env['LMS.host']}/api/v1/getuserstatusincourse`,
    goToUrl: `https://${process.env['LMS.host']}/api/v1/gotocourse`,
    addUserToBranch: `https://${process.env['LMS.host']}/api/v1/addusertobranch`,
};

const handleEmptyErrorResponse = (response, requestUrl) => {
    return response ? response.data.error : { message: `Invalid request to ${requestUrl}` };
};

const registerUser = async (data) => {
    let userCreated = true;
    try {
        await axios({
            method: 'post',
            url: settings.registerUrl,
            data: data,
            auth: settings.auth
        });
    } catch (error) {
        userCreated = false;
    }

    return userCreated;
};

const courseExists = async (courseId) => {
    const exists = {};
    const url = `${settings.coursesUrl}/id:${courseId}`;
    try {
        await axios({
            method: 'post',
            url: `${url}`,
            auth: settings.auth
        });
    } catch (err) {
        exists.err = handleEmptyErrorResponse(err.response, url);
        exists.err.courseId = courseId;
        exists.err.file = 'helpers/lms.js';
        exists.err.method = 'courseExists';
    }

    return exists;
};

const addUserToCourse = async (data) => {
    let addedToCourse = {};
    const url = settings.addToCourseUrl;
    try {
        const inCourse = await axios({
            method: 'post',
            url: url,
            data: {
                user_email: data.email,
                course_id: data.course_id || 0
            },
            auth: settings.auth
        });
        addedToCourse = inCourse.data;
    } catch (err) {
        addedToCourse.err = handleEmptyErrorResponse(err.response, url);
        addedToCourse.err.userEmail = data.email;
        addedToCourse.err.courseId = data.course_id;
        addedToCourse.err.file = 'helpers/lms.js';
        addedToCourse.err.method = 'addUserToCourse';
    }

    return addedToCourse;
};

const userIsInBranch = (user) => {
    let isInBranch = false;
    if (!user) return isInBranch;

    for (let i = 0; i < user.branches.length; i++) {
        if (user.branches[i].id === settings.branchId) {
            isInBranch = true;
        }
    }

    return isInBranch;
};

const addUserToBranch = async (userId) => {
    await axios({
        method: 'post',
        url: `${settings.addUserToBranch}/user_id:${userId},branch_id:${settings.branchId}`,
        auth: settings.auth
    });
};

const getUserByEmail = async (email) => {
    let userData = {};
    const url = `${settings.getUserByEmailUrl}:${email}`;
    try {
        const user = await axios({
            method: 'get',
            url: url,
            auth: settings.auth
        });
        userData = user.data;
    } catch (err) {
        userData.err = handleEmptyErrorResponse(err.response, url);
        userData.err.userEmail = email;
        userData.err.file = 'helpers/lms.js';
        userData.err.method = 'getUserByEmail';
    }

    return userData;
};

const updateUser = async (userLMS, user) => {
    const userUpdateData = new FormData();
    userUpdateData.append('user_id', userLMS.id);
    userUpdateData.append('first_name', user.first_name);
    userUpdateData.append('last_name', user.last_name);

    userUpdateData.submit({
        host: process.env['LMS.host'],
        path: '/api/v1/edituser',
        auth: `${settings.auth.username}:`
    }, function(err, res) {
        if (err) consola.log(err);
        res.resume();
    });
};

const getStatus = async (courseId, userId) => {
    let statusData = {};
    const url = `${settings.statusUrl}/course_id:${courseId},user_id:${userId}`
    try {
        const status = await axios({
            method: 'get',
            url: url,
            auth: settings.auth
        });
        statusData = status.data;
    } catch (err) {
        statusData.err = handleEmptyErrorResponse(err.response, url);
        statusData.err.courseId = courseId;
        statusData.err.userId = userId;
    }

    return statusData;
};

const getGoTo = async (courseId, userId) => {
    let goToData = {};
    const url = `${settings.goToUrl}/user_id:${userId},course_id:${courseId},header_hidden_options:courseName;units;sharedFiles;moreOptions`;
    try {
        const goto = await axios({
            method: 'get',
            url: url,
            auth: settings.auth
        });
        goToData = goto.data;
    } catch (err) {
        goToData.err = err.response ? err.response.data.error : { message: `Invalid request to ${url}` };
        goToData.err.courseId = courseId;
        goToData.err.userId = userId;
        goToData.err.file = 'helpers/lms.js';
        goToData.err.method = 'getGoTo';
    }

    if (goToData.goto_url) {
        goToData.goto_url = goToData.goto_url.replace('//training.kentico.com', '//kontent.training.kentico.com');
    }

    return goToData;
};

const getCertificate = (user, courseId) => {
    if (!user.certifications) return null;
    courseId = courseId.toString();

    for (let i = 0; i < user.certifications.length; i++) {
        if (user.certifications[i].course_id === courseId) {
            if ((new Date(user.certifications[i].expiration_date)).getTime() > (new Date()).getTime()) {
                return user.certifications[i].public_url;
            }
        }
    }

    return null;
};

const lms = {
    composeNotification: (text, info) => {
        text = `${text}\nenvironment: ${process.env.baseURL}`;

        if (typeof info === 'object') {
            return `${text}\n${Object.keys(info).map((key) => {
                return `${key}: ${info[key]}`;
            }).join('\n')}`;
        }

        return `${text}\n${info}`;
    },
    handleTrainingCourse: async (data, courseId) => {
        const user = {};
        user.login = data.email;
        user.email = data.email;
        user.first_name = data.firstName;
        user.last_name = data.lastName;
        user.password = generator.generate({
            length: 8,
            numbers: true
        });
        let userCreated = false;

        let userLMS = await getUserByEmail(user.login);

        if (userLMS.err) {
            userCreated = await registerUser(user);
            userLMS = await getUserByEmail(user.login);

            if (userLMS.err) {
                return {
                    url: '#',
                    completion: 101,
                    err: userLMS.err
                }
            }
        }

        const userToBeUpdated = !userCreated && !userLMS.err && (data.firstName !== userLMS.first_name || data.lastName !== userLMS.last_name);
        if (userToBeUpdated) {
            await updateUser(userLMS, user);
        }

        if (!userLMS.err && !userIsInBranch(userLMS)) {
            await addUserToBranch(userLMS.id);
        }

        const courseExistsInLMS = await courseExists(courseId);
        if (courseExistsInLMS.err) {
            return {
                url: '#',
                completion: 103,
                err: courseExistsInLMS.err
            }
        }

        await addUserToCourse({
            email: user.email,
            course_id: courseId
        });

        const status = await getStatus(courseId, userLMS.id);
        if (status.err) {
            return {
                url: '#',
                completion: 102,
                err: status.err
            }
        }

        const goTo = await getGoTo(courseId, userLMS.id);
        if (goTo.err) {
            return {
                url: '#',
                completion: 102,
                err: goTo.err
            }
        }

        const certificate = getCertificate(userLMS, courseId);

        return {
            url: goTo.goto_url,
            completion: parseInt(status.completion_percentage),
            certificate: certificate,
            target: '_blank'
        }
    }
}

module.exports = lms;
