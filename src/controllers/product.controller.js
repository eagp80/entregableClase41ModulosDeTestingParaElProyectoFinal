import { HttpResponse } from "../middleware/error-handler.js";
import { EnumErrors } from '../middleware/error-handler.js';
import ProductMongoManager from '../dao/managers/productMongo.manager.js';


class ProductController {
  constructor() {
    //this.productService = new ProductService();
    this.httpResp = new HttpResponse();
    this.enumError = EnumErrors;  
    this.productMongoManager = new ProductMongoManager();
    
  }

  createProduct = async (req, res) => {
    try {
      const productDTO = new ProductDTO(req.body);

      if (!productDTO.isValid()) {
        return this.httpResp.BAD_REQUEST(
          res,
          `${this.enumError.INVALID_PARAMS} Todos los campos son requeridos y deben ser válidos para crear un producto.`,
        );
      }

      let thumbnails = null;

      if (req.file) {
        thumbnails = `/upload/${req.file.filename}`;
      }

      const productData = {
        title: productDTO.title,
        description: productDTO.description,
        price: productDTO.price,
        stock: productDTO.stock,
        category: productDTO.category,
        thumbnails,
      };

      if (req.user && req.user.role === 'PREMIUM') {
        productData.owner = req.user.email;
      } else {
        productData.owner = 'ADMIN';
      }

      const createdProduct = await this.productService.createProduct(productData);

      return this.httpResp.OK(res, 'Agregando productos a la base de datos', { createdProduct });
    } catch (error) {
      return this.httpResp.ERROR(res, `${this.enumError.CONTROLLER_ERROR}Error al crear el producto `, {
        error: error.message,
      });
    }
  };

  getAllProducts = async (req, res) => {
    try {
      const products = await this.productService.getAllProducts();
      return this.httpResp.OK(res, 'Tomando productos agregados por el administrador', { products });
    } catch (error) {
      return this.httpResp.ERROR(res, `${this.enumError.CONTROLLER_ERROR}Error al traer los productos `, {
        error: error.message,
      });
    }
  };

  getProductById = async (req, res) => {
    try {
      const { pid } = req.params;
      const productMongoDetail = await this.productMongoManager.getProductMongoById(
        pid
      );
      // TODO: AGREGAR VALIDACION
      return this.httpResp.OK(res, `get productMongo info of ${pid} succesfully`, {
        productMongo: productMongoDetail})

    } catch (error) {
      req.logger.fatal(
        `Method: ${req.method}, url: ${
          req.url
        } - time: ${new Date().toLocaleTimeString()
        } con ERROR: ${error.message}`); 

      this.httpResp.ERROR(res, `${this.enumError.CONTROLLER_ERROR} Error al solicitar el producto `, {
        error: error.message,
      });      
    }
  };

  updateProductById = async (req, res) => {
    try {
      const { pId } = req.params;
      const newData = req.body;
      if (req.file) {
        const newImagePath = `/upload/${req.file.filename}`;
        newData.thumbnails = newImagePath;
      }
      const updatedProduct = await this.productService.updateProductById(pId, newData);

      if (!updatedProduct) {
        return this.httpResp.BAD_REQUEST(
          res,
          `${this.enumError.INVALID_PARAMS} No se encontró o no se pudo actualizar el producto solicitado.`,
        );
      }

      return this.httpResp.OK(res, 'El producto fue actualizado correctamente ', { updatedProduct });
    } catch (error) {
      return this.httpResp.ERROR(res, `${this.enumError.CONTROLLER_ERROR} Error al actualizar el producto `, {
        error: error.message,
      });
    }
  };

  deleteProductById = async (req, res) => {
    try {
      const { pId } = req.params;

      const deletedProduct = await this.productService.deleteProductById(pId);

      if (!deletedProduct) {
        return this.httpResp.BAD_REQUEST(
          res,
          `${this.enumError.DB_ERROR} No se encontro o se pudo eliminar el producto solicitado.`,
        );
      }

      return this.httpResp.OK(res, 'El producto fue eliminado correctamente ');
    } catch (error) {
      return this.httpResp.ERROR(res, `${this.enumError.CONTROLLER_ERROR}error al eliminar el producto `, {
        error: error.message,
      });
    }
  };
}

export default ProductController;
