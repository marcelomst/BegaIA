## 📋 Estructura recomendada de la colección 
|   Campo               |Tipo (Cassandra/AstraDB)               |	Descripción
------------------------|---------------------------------------|----------------------------------
|   key                 |text (o UUID, pero usás text aquí)	    |Clave primaria
|   hotelId	            |text	                                |ID del hotel
|   category	        |text	                                |Categoría semántica (ej: amenities, etc)
|   promptKey	        |text	                                |Clave de prompt curado
|   version	            |text	                                |(Opcional, útil para versionado de docs)
|   author              |text                                   |(Opcional,quien relato el doumento)
|   uploader	        |text	                                |(email quién subió el doc)
|   text	            |text	                                |Texto plano
|   query_vector_value	|vector<float, 1536>	                |Embedding vectorial (debe ser tipo vector)
|   uploadedAt	        |text o timestamp	                    |Fecha de carga
|   doc_json	        |text	                                |El JSON original completo, si quieres
|   originalName	    |text	                                |Nombre original del archivo/fuente

