export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ users: await this.userService.listUsers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const users = await this.userService.createUser(req.body, req.currentUser);
      res.status(201).json({ users });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const users = await this.userService.updateUser(req.params.id, req.body, req.currentUser);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const users = await this.userService.deleteUser(req.params.id, req.currentUser);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      const user = await this.userService.updateProfile(req.currentUser, req.body);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { tempPassword, users } = await this.userService.resetUserPassword(req.params.id, req.currentUser);
      res.json({ tempPassword, users });
    } catch (error) {
      next(error);
    }
  };

  unlock = async (req, res, next) => {
    try {
      const users = await this.userService.unlockUser(req.params.id, req.currentUser);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  };

  listPasswordResetRequests = async (req, res, next) => {
    try {
      const requests = await this.userService.listPasswordResetRequests(req.currentUser);
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  };
}
