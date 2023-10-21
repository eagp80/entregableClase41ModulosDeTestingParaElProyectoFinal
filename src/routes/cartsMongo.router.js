import { Router } from "express";
import { passportCall } from "../utils/jwt.js";
import handlePolicies from "../middleware/handle-policies.middleware.js";
import CartController from "../controllers/cart.controller.js";

const cartController = new CartController();


class CartsMongoRoutes {
  path = "/carts";
  router = Router();


  constructor() {
    this.initCartsMongoRoutes();
  }

  initCartsMongoRoutes() {
    //******* Crear un carrito nuevo con un array vacío de products ***********************
    //******  POST DE /api/v1/cartsmongo **************************************************    
    this.router.post(`${this.path}`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.createCart);

    //********** Obtener un carrito con Id de carrito *************************************
    //******  GET DE /api/v1/carts/:cid **************************************
    this.router.get(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.getCartById);

    //*********** Agregar un Id de  producto a un carrito dado por su Id *****************
    //******  POST DE /api/v1/carts/:cid/products/:pid *************
    this.router.post(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.createProductInCart);

    // Eliminar un Id de  producto de un carrito por medio de Id de carrito  **************
    //******  DELETE DE /api/v1/cartsmongo/:cid/productMongo/:produtMongoId   ************
    this.router.delete(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.deleteItemInCart);

    //****** VACIAR el array de products de un carrito por medio de Id CARRITO ************
    //******  DELETE DE /api/v1/cartsmongo/:cid **********************************
    this.router.delete(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.deleteAllProductsInCart);

    //******  Actualizar el array de products por medio de Id de carrito ******************
    //******  PUT DE /api/v1/cartsmongo/:cid  ************************************
    this.router.put(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.updateCartById);

    //******  Actualizar  SÓLO la cantidad de ejemplares  del producto ********************
    //******* por cualquier cantidad pasada desde req.body.     ***************************
    //******  PUT DE /api/v1/cartsmongo/:cid/productMongo/:produtMongoId **********************************
    this.router.put(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.updateCartItemQuantity);

    this.router.post(`${this.path}/:cid/purchase`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.purchaseCart)
  }
}

export default CartsMongoRoutes;
