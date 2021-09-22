const trainingCourse = (() => {
  const requestInfo = async (trainingCodename, token) => {
    let access = 'public';
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        codename: trainingCodename
      })
    };

    if (token) {
      fetchOptions.headers = { Authorization: `Bearer ${token}` };
      access = 'private'
    }

    const result = await fetch(`/api/training-course/detail/${access}`, fetchOptions);
    const data = await result.json();
    console.log(data);
  };

  const getInfo = async () => {
    if (!window.trainingCourseCodename) return;
    let claims = null;
    try {
      await auth0.client.getTokenSilently();
      claims = await auth0.client.getIdTokenClaims();
    } 
    catch (e) { }
    finally {
      const token = claims ? claims.__raw : null;
      await requestInfo(window.trainingCourseCodename, token);
    }
  };

  return {
    getInfo: getInfo
  }
})();