const express = require('express');
const projectService = require('../services/projectService');

const router = express.Router();

const getManagerId = (req) => req.headers['x-manager-id'];

router.get('/', async (req, res) => {
  try {
    const projects = await projectService.listProjects(getManagerId(req));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const project = await projectService.createProject({ ...req.body, manager_id: getManagerId(req) });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const project = await projectService.updateProject({
      id: req.params.id,
      manager_id: getManagerId(req),
      ...req.body,
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const member = await projectService.addProjectMember({
      project_id: req.params.id,
      manager_id: getManagerId(req),
      ...req.body,
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
