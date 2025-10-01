import { getAwsClients } from '../services/awsClients.js';

export async function listCognitoUsers(req, res) {
  try {
    const { cognito, config } = getAwsClients();
    const response = await cognito
      .listUsers({
        UserPoolId: config.cognitoUserPoolId
      })
      .promise();

    const users = (response.Users || []).map((user) => ({
      username: user.Username,
      status: user.UserStatus,
      createdAt: user.UserCreateDate,
      updatedAt: user.UserLastModifiedDate,
      email:
        user.Attributes?.find((attribute) => attribute.Name === 'email')?.Value || null
    }));

    return res.json({ users });
  } catch (error) {
    console.error('list users failed', error);
    return res.status(500).json({ error: { message: 'Unable to list users' } });
  }
}

export async function deleteCognitoUser(req, res) {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: { message: 'username is required' } });
    }

    const { cognito, config } = getAwsClients();
    await cognito
      .adminDeleteUser({
        UserPoolId: config.cognitoUserPoolId,
        Username: username
      })
      .promise();

    return res.json({ message: 'User deleted', username });
  } catch (error) {
    console.error('delete user failed', error);
    return res.status(500).json({ error: { message: 'Unable to delete user' } });
  }
}
