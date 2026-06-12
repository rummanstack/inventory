export class IssueController {
  constructor(issueService) {
    this.issueService = issueService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.issueService.listIssues(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.issueService.saveIssue(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const issue = await this.issueService.updateIssue(req.params.id, req.body, req.currentUser);
      res.json({ issue });
    } catch (error) {
      next(error);
    }
  };
}
