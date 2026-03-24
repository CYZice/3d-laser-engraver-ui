cmake_minimum_required(VERSION 4.1)
project(ModelTransformer)

set(CMAKE_CXX_STANDARD 20)

include_directories("${CMAKE_CURRENT_SOURCE_DIR}/include"
                    "${CMAKE_CURRENT_SOURCE_DIR}/model_loader"
                    "${CMAKE_CURRENT_SOURCE_DIR}/point_cloud"
                    "${CMAKE_CURRENT_SOURCE_DIR}/arg_parser"
)

set(ASSIMP_MODEL_LOADER
        model_loader/model_loader.h
        model_loader/model_loader.cpp
        model_loader/plane_coordinate_transform.h
        model_loader/plane_coordinate_transform.cpp
        model_loader/units_define.h
        model_loader/units_define.cpp
        point_cloud/point_cloud_loader.h
        point_cloud/point_cloud_loader.cpp
)

set(ARG_PARSER
        arg_parser/CLI11.hpp
        point_cloud/BinaryMesh.cpp
        point_cloud/BinaryMesh.h
)

add_executable(ModelTransformer main.cpp
        ${ASSIMP_MODEL_LOADER}
        ${ARG_PARSER}
)

target_include_directories(ModelTransformer PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/include"
)

if (MSVC)
    # Windows MSVC：使用项目内预编译的 assimp 库
    set(TARGET_MODE)
    set(LIB_DEBUG_SUFFIX)
    if (CMAKE_BUILD_TYPE MATCHES "Debug")
        set(TARGET_MODE "Debug")
        set(LIB_DEBUG_SUFFIX "d")
    else ()
        set(TARGET_MODE "Release")
        set(LIB_DEBUG_SUFFIX "")
    endif ()

    set(ASSIMP_LIB_PATH "${CMAKE_CURRENT_SOURCE_DIR}/lib/${TARGET_MODE}/assimp-vc143-mt${LIB_DEBUG_SUFFIX}.lib")

    target_include_directories(ModelTransformer PRIVATE
            "${CMAKE_CURRENT_SOURCE_DIR}/lib/${TARGET_MODE}"
    )
    target_link_libraries(ModelTransformer PRIVATE ${ASSIMP_LIB_PATH})

    add_custom_command(TARGET ModelTransformer POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_CURRENT_SOURCE_DIR}/bin/${TARGET_MODE}/assimp-vc143-mt${LIB_DEBUG_SUFFIX}.dll"
            "$<TARGET_FILE_DIR:ModelTransformer>"
    )
else ()
    # macOS / Linux：通过系统包管理器安装的 assimp
    if (APPLE)
        # 自动检测 Homebrew 安装路径（兼容 Apple Silicon 和 Intel）
        execute_process(
                COMMAND brew --prefix
                OUTPUT_VARIABLE HOMEBREW_PREFIX
                OUTPUT_STRIP_TRAILING_WHITESPACE
                ERROR_QUIET
        )
        if (HOMEBREW_PREFIX)
            list(APPEND CMAKE_PREFIX_PATH "${HOMEBREW_PREFIX}")
        endif ()
    endif ()

    find_package(assimp REQUIRED)
    target_link_libraries(ModelTransformer PRIVATE assimp::assimp)
endif ()