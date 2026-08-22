const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

try {
  initializeApp({ projectId: "ai-studio-adinstoryengine-ce694b4e-d382-42d2-8966-f59ff8df7975" });
  
  getAuth().getUserByEmail('admin@gmail.com')
    .then((userRecord) => {
      console.log('Successfully fetched user data:', userRecord.toJSON());
    })
    .catch((error) => {
      console.log('Error fetching user data:', error);
    });
} catch (e) {
  console.log("no default creds")
}
