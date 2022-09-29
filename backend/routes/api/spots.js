const express = require('express')
const { setTokenCookie, restoreUser, requireAuth } = require('../../utils/auth');
const { User, Spot, Booking, Review, ReviewImage, SpotImage, sequelize } = require('../../db/models');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const router = express.Router();
const { Op } = require('sequelize');

//set up validation
const validateSpot = [
    check('address')
        .exists({ checkFalsy: true })
        .withMessage('Street address is required'),
    check('city')
        .exists({ checkFalsy: true })
        .withMessage('City is required'),
    check('state')
        .exists({ checkFalsy: true })
        .withMessage('State is required'),
    check('country')
        .exists({ checkFalsy: true })
        .withMessage('Country is required'),
    check('lat')
        .exists({ checkFalsy: true })
        .isDecimal()
        .withMessage('Latitude is not valid'),
    check('lng')
        .exists({ checkFalsy: true })
        .isDecimal()
        .withMessage('Longitude is not valid'),
    check('name')
        .exists({ checkFalsy: true })
        .isLength({ max: 50 })
        .withMessage('Name must be less than 50 characters'),
    check('description')
        .exists({ checkFalsy: true })
        .withMessage('Description is required'),
    check('price')
        .exists({ checkFalsy: true })
        .isDecimal()
        .withMessage('Price per day is required'),
    handleValidationErrors
];

//validate reviews
const validateReview = [
    check('review')
        .exists({ checkFalsy: true })
        .withMessage('Review text is required'),
    check('stars')
        .exists({ checkFalsy: true })
        .withMessage('Stars must be an integer from 1 to 5'),
    handleValidationErrors
];

//calculate average rating to use for all later spot returns
const avgRate = async (spotId) => {
    const avgR = await Review.findAll({
        where: {
            spotId
        },
        raw: true,
        next: true,
        attributes: [[sequelize.fn('AVG', sequelize.col('stars')),
            'avgRating'
        ]]
    })
    return avgR;
}

//Get all Spots, Auth:false
router.get('/', async (req, res) => {
    let allspots = await Spot.findAll({});

    let Spots = [];
    allspots.forEach(spot => {
        Spots.push(spot.toJSON());
    })

    for (let i = 0; i < Spots.length; i++) {
        //add average rating to spot
        const avgR = await avgRate(Spots[i].id);
        const avgRvalue = avgR[0].avgRating === null ? 0 : avgR[0].avgRating;
        const avgRvalFixed = Number(avgRvalue).toFixed(1);

        Spots[i].avgRating = parseFloat(avgRvalFixed);

        //add image preview to spot
        const prevImgUrl = await SpotImage.findOne({
            raw: true,
            nest: true,
            where: {
                spotId: Spots[i].id,
                preview: true,
            },
        })

        if (prevImgUrl) {
            Spots[i].previewImage = prevImgUrl.url
        } else {
            Spots[i].previewImage = null
        }
    }

    return res.json({
        Spots
    })

})


// Create a spot, Auth:true
router.post('/', requireAuth, validateSpot, async (req, res) => {
    const { address, city, state, country, lat, lng, name, description, price } = req.body;
    const newSpot = await Spot.create({ ownerId: req.user.id, address, city, state, country, lat, lng, name, description, price });

    res.status(201);
    return res.json(
        newSpot
    )
})


//Add an image to a spot based on spot's id
//Auth:true, spot belong to owner
router.post('/:spotId/images', requireAuth, async (req, res) => {
    const { url, preview } = req.body;
    let userId = req.user.id;
    let spotId = req.params.spotId;

    const spot = await Spot.findByPk(spotId)
    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    if (spot.toJSON().ownerId == userId) {
        const newSpotImage = await SpotImage.create({ spotId: spotId, url, preview })
        const returnNewImage = await SpotImage.findByPk(newSpotImage.id, {
            attributes: ['id', 'url', 'preview']
        })
        return res.json(returnNewImage)
    } else {
        res.status(403);
        return res.json({
            message: "Spot must belong to the current user",
            statusCode: 403,
        })
    }

})


//Get all spots owned by the current user, Auth:true
router.get('/current', requireAuth, async (req, res) => {
    let userId = req.user.id;
    const Spots = await Spot.findAll({
        where: {
            ownerId: userId
        },
        raw: true,
        nest: true,
    });

    for (let i = 0; i < Spots.length; i++) {
        //add average rating to spot
        const avgR = await avgRate(Spots[i].id);
        const avgRvalue = avgR[0].avgRating === null ? 0 : avgR[0].avgRating;
        const avgRvalFixed = Number(avgRvalue).toFixed(1);

        Spots[i].avgRating = parseFloat(avgRvalFixed);

        //add image preview to spot
        const prevImgUrl = await SpotImage.findOne({
            raw: true,
            nest: true,
            where: {
                spotId: Spots[i].id,
                preview: true,
            },
        })

        if (prevImgUrl) {
            Spots[i].previewImage = prevImgUrl.url
        } else {
            Spots[i].previewImage = null
        }
    }

    return res.json({
        Spots
    })

})


//Get details for a spot from an id, Auth:false
router.get('/:spotId', requireAuth, async (req, res) => {
    let spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId, { raw: true, nest: true })

    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    //add numReviews to spot
    const reviews = await Review.findAll({
        where: {
            spotId: spotId
        },
        raw: true,
        nest: true,
    })
    spot.numReviews = reviews.length;

    //add average rating to spot
    const avgR = await avgRate(spotId);
    const avgRvalue = avgR[0].avgRating === null ? 0 : avgR[0].avgRating;
    const avgRvalFixed = Number(avgRvalue).toFixed(1);
    spot.avgStarRating = parseFloat(avgRvalFixed);

    //add spotimages to spot
    const spotimages = await SpotImage.findAll({
        where: { spotId: spotId },
        attributes: ['id', 'url', 'preview']
    })
    spot.SpotImages = spotimages;

    //add owner to spot
    spot.Owner = await User.findOne({
        where: { id: spot.ownerId },
        attributes: ['id', 'firstName', 'lastName']
    })

    return res.json(
        spot
    )
})


//Edit a spot, Auth:true, spot belong to current user
router.put('/:spotId', requireAuth, validateSpot, async (req, res) => {
    const { address, city, state, country, lat, lng, name, description, price } = req.body;
    let userId = req.user.id;
    let spotId = req.params.spotId;

    const spot = await Spot.findByPk(spotId)
    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    if (spot.toJSON().ownerId == userId) {
        spot.update({ address, city, state, country, lat, lng, name, description, price });
        return res.json(spot)
    } else {
        res.status(403);
        return res.json({
            message: "Spot must belong to the current user",
            statusCode: 403,
        })
    }
})


//Delete a spot, Auth:true, spot belong to current user
router.delete('/:spotId', requireAuth, async (req, res) => {
    let userId = req.user.id;
    let spotId = req.params.spotId;

    const spot = await Spot.findByPk(spotId)
    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    if (spot.toJSON().ownerId == userId) {
        spot.destroy();
        return res.json({
            message: "Successfully deleted",
            statusCode: 200,
        })
    } else {
        res.status(403);
        return res.json({
            message: "Spot must belong to the current user",
            statusCode: 403,
        })
    }

})


// Create a review for a spot based on the spot's id
//Auth:true
router.post('/:spotId/reviews', requireAuth, validateReview, async (req, res) => {
    const { review, stars } = req.body;

    let userId = req.user.id;
    let spotId = parseInt(req.params.spotId);

    const spot = await Spot.findByPk(spotId)
    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    const spotReviews = await Review.findOne({
        where: {
            userId: userId,
            spotId: spotId,
        }
    })
    if (spotReviews) {
        res.status(403);
        return res.json({
            message: "User already has a review for this spot",
            statusCode: 403,
        })
    }

    if (stars > 0 && stars <= 5) {
        const newReview = await Review.create({ userId, spotId, review, stars })
        res.status(201);
        return res.json(newReview)

    } else {
        res.status(400);
        return res.json({
            message: "Validation error",
            statusCode: 400,
            errors: {
                stars: "Stars must be an integer from 1 to 5",
            }
        })
    }
})


//Get all reviews by a spot's id, Auth:false
router.get('/:spotId/reviews', async (req, res) => {
    let userId = req.user.id;
    let spotId = parseInt(req.params.spotId);

    const spot = await Spot.findByPk(spotId)
    if (!spot) {
        res.status(404);
        return res.json({
            message: "Spot couldn't be found",
            statusCode: 404,
        })
    }

    const Reviews = await Review.findAll({
        where: { spotId },
        include: [
            {
                model: User,
                attributes: ['id', 'firstName', 'lastName']
            },
            {
                model: ReviewImage,
                attributes: ['id', 'url']
            },
        ],
    })

    return res.json({ Reviews })
})



module.exports = router;
