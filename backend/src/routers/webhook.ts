import express from 'express';
import {config} from '../config.js';
import AuthService from '../services/authService.js';
import { WorkFlowService } from '../services/workflowService.js';

const authService = new AuthService();
const workflowService = new WorkFlowService(authService);
const router = express.Router();

router.post('/contactownerchange', async (req, res) => {
    try {
        const requestBody = req.body.toString('utf8');
        
        if (!workflowService.validateSignature(req.headers, requestBody)) {
            return res.status(400).json({ error: 'Invalid HubSpot Signature' });
        }

        let parsedBody;
        try {
            parsedBody = JSON.parse(requestBody);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid JSON in request body' });
        }

        // Assuming only one event is sent in the body
        const event = parsedBody[0];
        if (!event) {
            return res.status(400).json({ error: 'Missing event in request body' });
        }

        const objectId = event.objectId;
        if (!objectId) {
            return res.status(400).json({ error: 'Missing objectId in request body' });
        }

        const userAccountId = event.portalId;
        if (!userAccountId) {
            return res.status(400).json({ error: 'Missing portalId in request body' });
        }

        const result = await workflowService.contactOwnerChange(objectId, userAccountId);
        return res.json({ message: 'Contact owner change processed successfully', data: result });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message 
        });
    }
});

export default router;