const express = require('express');
const router = express.Router();
const reviewController = require('../Controller/reviewController');
const authMiddleware = require('../Middlewares/authMiddleware');

router.post('/', authMiddleware.authenticate, reviewController.createReview);
router.get('/professional/:id', reviewController.getProfessionalReviews);  // Obtener reseñas del profesional
router.get('/:id', reviewController.getReviewById);  // Obtener una reseña específica
router.put('/:id', authMiddleware.authenticate, reviewController.updateReview);  // Actualizar reseña
router.delete('/:id', authMiddleware.authenticate, reviewController.deleteReview);  // Eliminar reseña

module.exports = router;
