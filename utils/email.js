const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVerificationEmail(email, code) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Job Portal!</h2>
          <p>Thank you for registering. Please use the following verification code to verify your email address:</p>
          <h1 style="letter-spacing: 12px; font-size: 2em; margin: 20px 0;">${code}</h1>
          <p>This code will expire in 24 hours.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending verification email:', err);
    throw err;
  }
}

async function sendWelcomeEmail(email, name) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Job Portal!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome ${name}!</h2>
          <p>Your email has been verified successfully. You can now:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Browse and apply for jobs</li>
            <li>Connect your Web3 wallet</li>
            <li>Get AI-powered job recommendations</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
             Go to Dashboard
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending welcome email:', err);
    throw err;
  }
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail
};
