import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/contacts', async (req: Request, res: Response): Promise<void> => {
    const { contact_owner, contact_woner } = req.body;

    if (!contact_owner || !contact_woner) {
        res.status(400).json({ 
            success: false,
            error: 'Contact owner and contact woner are required' 
        });
        return;
    }

    // TODO: Implement HubSpot contacts functionality
    res.status(501).json({
        success: false,
        error: 'Not implemented',
        message: 'HubSpot contacts functionality not yet implemented'
    });
});

export default router;
